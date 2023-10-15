import "../load-env";

import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as efs from "aws-cdk-lib/aws-efs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  private readonly MoodleDatabaseName = "moodledb";
  private readonly MoodleDatabaseUsername = "dbadmin";

  private resource_name(name: string) {
    return `${this.stackName}-${name}`;
  }

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const trailBucket = new s3.Bucket(
      this,
      this.resource_name("cloudtrail-bucket"),
      {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        encryption: s3.BucketEncryption.S3_MANAGED,
      }
    );
    const trail = new cloudtrail.Trail(
      this,
      this.resource_name("cloudtrail-trail"),
      {
        bucket: trailBucket,
      }
    );

    const vpc = new ec2.Vpc(this, this.resource_name("vpc"), {
      maxAzs: 2,
      flowLogs: {
        "flowlog-to-cloudwatch": {
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

    const ecrVpcEndpoint = vpc.addInterfaceEndpoint(
      this.resource_name("ecr-vpc-endpoint"),
      {
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
      }
    );
    const s3VpcEndpoint = vpc.addGatewayEndpoint(
      this.resource_name("s3-vpc-endpoint"),
      {
        service: ec2.GatewayVpcEndpointAwsService.S3,
      }
    );

    const cluster = new ecs.Cluster(this, this.resource_name("ecs-cluster"), {
      vpc: vpc,
      clusterName: this.resource_name("ecs-cluster"),
      containerInsights: true,
      enableFargateCapacityProviders: true,
    });

    const moodleDb = new rds.DatabaseInstance(
      this,
      this.resource_name("mysql-db"),
      {
        engine: rds.DatabaseInstanceEngine.mysql({
          version: rds.MysqlEngineVersion.VER_8_0_32,
        }),
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        instanceType: new ec2.InstanceType(process.env.RDS_INSTANCE_TYPE!),
        allocatedStorage: 30,
        maxAllocatedStorage: 300,
        storageType: rds.StorageType.GP2,
        autoMinorVersionUpgrade: true,
        multiAz: true,
        databaseName: this.MoodleDatabaseName,
        credentials: rds.Credentials.fromGeneratedSecret(
          this.MoodleDatabaseUsername,
          { excludeCharacters: "(\" %+~`#$&*()|[]{}:;<>?!'/^-,@_=\\" }
        ), // Punctuations are causing issue with Moodle connecting to the database
        enablePerformanceInsights: false,
        backupRetention: cdk.Duration.days(7),
        storageEncrypted: true,
      }
    );
    const rdsEventSubscriptionTopic = new sns.Topic(
      this,
      this.resource_name("rds-event-subscription-topic"),
      {}
    );
    rdsEventSubscriptionTopic.addSubscription(
      new subscriptions.EmailSubscription(
        process.env.RDS_EVENT_SUBSCRIPTION_EMAIL_ADDRESS!
      )
    );
    const rdsEventSubscription = new rds.CfnEventSubscription(
      this,
      this.resource_name("rds-event-subscription"),
      {
        enabled: true,
        snsTopicArn: rdsEventSubscriptionTopic.topicArn,
        sourceType: "db-instance",
        eventCategories: [
          "availability",
          "configuration change",
          "failure",
          "maintenance",
          "low storage",
        ],
      }
    );

    const moodledataEfs = new efs.FileSystem(
      this,
      this.resource_name("moodledata-efs"),
      {
        vpc: vpc,
        lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS,
        outOfInfrequentAccessPolicy:
          efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS,
        performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
        throughputMode: efs.ThroughputMode.ELASTIC,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        enableAutomaticBackups: true,
      }
    );
    const moodleEfsAccessPoint = moodledataEfs.addAccessPoint(
      this.resource_name("moodledata-efs-access-point"),
      {
        path: "/",
      }
    );

    const redisSG = new ec2.SecurityGroup(
      this,
      this.resource_name("redis-sg"),
      {
        vpc: vpc,
      }
    );

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      this.resource_name("redis-subnet-group"),
      {
        cacheSubnetGroupName: `${cdk.Names.uniqueId(this)}-redis-subnet-group`,
        description: "Moodle Redis Subnet Group",
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
      }
    );

    const moodleRedis = new elasticache.CfnReplicationGroup(
      this,
      this.resource_name("redis"),
      {
        replicationGroupDescription: "Moodle Redis",
        cacheNodeType: process.env.ELASTICACHE_REDIS_INSTANCE_TYPE,
        engine: "redis",
        numCacheClusters: 2,
        multiAzEnabled: true,
        automaticFailoverEnabled: true,
        autoMinorVersionUpgrade: true,
        cacheSubnetGroupName: `${cdk.Names.uniqueId(this)}-redis-subnet-group`,
        securityGroupIds: [redisSG.securityGroupId],
        atRestEncryptionEnabled: true,
      }
    );
    moodleRedis.addDependency(redisSubnetGroup);

    const moodleTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      this.resource_name("moodle-task-def"),
      {
        cpu: 2048,
        memoryLimitMiB: 4096,
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        },
      }
    );
    moodleTaskDefinition.addToExecutionRolePolicy(
      iam.PolicyStatement.fromJson({
        Effect: "Allow",
        Action: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Resource: "*",
      })
    );

    moodleTaskDefinition.addVolume({
      name: "moodledata",
      efsVolumeConfiguration: {
        fileSystemId: moodledataEfs.fileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: moodleEfsAccessPoint.accessPointId,
        },
      },
    });

    const moodlePasswordSecret = new secretsmanager.Secret(
      this,
      this.resource_name("moodle-password-secret")
    );
    const moodleContainerDefinition = moodleTaskDefinition.addContainer(
      this.resource_name("moodle-container"),
      {
        containerName: this.resource_name("moodle"),
        image: ecs.ContainerImage.fromRegistry(
          `${process.env.MOODLE_IMAGE_HOST}/${process.env.MOODLE_IMAGE_NAME}:${process.env.MOODLE_IMAGE_TAG}`
        ),
        memoryLimitMiB: 4096,
        portMappings: [{ containerPort: 80 }],
        stopTimeout: cdk.Duration.seconds(120),
        environment: {
          MOODLE_DATABASE_TYPE: "mysqli",
          MOODLE_DATABASE_HOST: moodleDb.dbInstanceEndpointAddress,
          MOODLE_DATABASE_PORT_NUMBER: moodleDb.dbInstanceEndpointPort,
          MOODLE_REDIS_HOST: moodleRedis.attrPrimaryEndPointAddress,
          MOODLE_REDIS_PORT: moodleRedis.attrPrimaryEndPointPort,
          MOODLE_DATABASE_NAME: this.MoodleDatabaseName,
          MOODLE_DATABASE_USER: this.MoodleDatabaseUsername,
          MOODLE_USERNAME: "moodleadmin",
          MOODLE_EMAIL: "hello@example.com",
          MOODLE_SITE_NAME: "Scalable Moodle on ECS Fargate",
          MOODLE_SKIP_BOOTSTRAP: "no",
          MOODLE_SKIP_INSTALL: "no",
          BITNAMI_DEBUG: "true",
        },
        secrets: {
          MOODLE_DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(
            moodleDb.secret!,
            "password"
          ),
          MOODLE_PASSWORD: ecs.Secret.fromSecretsManager(moodlePasswordSecret),
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: this.resource_name("ecs-moodle"),
        }),
      }
    );
    moodleContainerDefinition.addMountPoints({
      sourceVolume: "moodledata",
      containerPath: "/moodledata",
      readOnly: false,
    });

    const moodleService = new ecs.FargateService(
      this,
      this.resource_name("fargate-service"),
      {
        cluster: cluster,
        taskDefinition: moodleTaskDefinition,
        desiredCount: parseInt(process.env.SERVICE_REPLICA_DESIRED_COUNT!),
        capacityProviderStrategies: [
          // Every 1 task which uses FARGATE, 3 tasks will use FARGATE_SPOT (25% / 75%)
          {
            capacityProvider: "FARGATE_SPOT",
            weight: 3,
          },
          {
            capacityProvider: "FARGATE",
            weight: 1,
          },
        ],
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        enableECSManagedTags: true,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        healthCheckGracePeriod: cdk.Duration.seconds(
          parseInt(process.env.SERVICE_HEALTH_CHECK_GRACE_PERIOD_SECONDS!)
        ),
        // circuitBreaker: { rollback: true },
      }
    );

    const moodleServiceScaling = moodleService.autoScaleTaskCount({
      minCapacity: parseInt(process.env.SERVICE_REPLICA_DESIRED_COUNT!),
      maxCapacity: 10,
    });
    moodleServiceScaling.scaleOnCpuUtilization(
      this.resource_name("cpu-scaling"),
      {
        targetUtilizationPercent: 50,
      }
    );

    // Allow access using Security Groups
    moodleDb.connections.allowDefaultPortFrom(
      moodleService,
      "From Moodle ECS Service"
    );
    moodledataEfs.connections.allowDefaultPortFrom(
      moodleService,
      "From Moodle ECS Service"
    );
    redisSG.connections.allowFrom(
      moodleService,
      ec2.Port.tcp(6379),
      "From Moodle ECS Service"
    );

    // Moodle Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      this.resource_name("alb"),
      {
        loadBalancerName: this.resource_name("ecs-alb"),
        vpc: vpc,
        internetFacing: true,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      }
    );
    const httpListener = alb.addListener(this.resource_name("http-listener"), {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });
    const httpsListener = alb.addListener(
      this.resource_name("https-listener"),
      {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        open: true,
        certificates: [
          elbv2.ListenerCertificate.fromArn(process.env.ALB_CERTIFICATE_ARN!),
        ],
      }
    );
    const targetGroup = httpsListener.addTargets(
      this.resource_name("service-tg"),
      {
        port: 80,
        targets: [
          moodleService.loadBalancerTarget({
            containerName: this.resource_name("moodle"),
            containerPort: 80,
            protocol: ecs.Protocol.TCP,
          }),
        ],
        healthCheck: {
          timeout: cdk.Duration.seconds(20),
        },
      }
    );

    new cdk.CfnOutput(this, "APPLICATION-LOAD-BALANCER-DNS-NAME", {
      value: alb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "MOODLE-USERNAME", {
      value: "moodleadmin",
    });
    new cdk.CfnOutput(this, "MOODLE-PASSWORD-SECRET-ARN", {
      value: moodlePasswordSecret.secretArn,
    });
    new cdk.CfnOutput(this, "MOODLE-REDIS-PRIMARY-ENDPOINT-ADDRESS-AND-PORT", {
      value: `${moodleRedis.attrPrimaryEndPointAddress}:${moodleRedis.attrPrimaryEndPointPort}`,
    });
    new cdk.CfnOutput(this, "ECS-CLUSTER-NAME", {
      value: cluster.clusterName,
    });
    new cdk.CfnOutput(this, "ECS-VPC-ID", {
      value: vpc.vpcId,
    });
    new cdk.CfnOutput(this, "MOODLE-SERVICE-NAME", {
      value: moodleService.serviceName,
    });
  }
}
