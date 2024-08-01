import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib'; 

const DATABASE_NAME = 'bancosegurodb';
const API_NAME = 'BancariaApi';
const LAMBDA_HANDLER = 'lambda/index.handler';
const LAMBDA_CODE = lambda.Code.fromAsset('lambda');
const LAMBDA_MEMORY_SIZE = 128;
const LAMBDA_TIMEOUT = Duration.seconds(30); 

interface LambdaOptions {
  runtime: lambda.Runtime;
  handler: string;
  code: lambda.Code;
  memorySize: number;
  timeout: Duration;
  environment: {
    [key: string]: string;
  };
}

interface ApiGatewayOptions {
  restApiName: string;
  deployOptions: {
    stageName: string;
  };
}

interface PolicyStatement {
  effect: iam.Effect;
  actions: string[];
  resources: string[];
}

class BancariaApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAzs: 2 });

    const database = new rds.DatabaseInstance(this, 'bancosegurodb', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }),
      deleteAutomatedBackups: true,
      vpc: vpc,
    });

    const apiGatewayOptions: ApiGatewayOptions = {
      restApiName: API_NAME,
      deployOptions: {
        stageName: 'prod',
      },
    };

    const api = new apigateway.RestApi(this, API_NAME, apiGatewayOptions);

    const lambdaOptions: LambdaOptions = {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: LAMBDA_HANDLER,
      code: LAMBDA_CODE,
      memorySize: LAMBDA_MEMORY_SIZE,
      timeout: LAMBDA_TIMEOUT,
      environment: {
        DATABASE_HOST: database.instanceEndpoint.hostname,
        DATABASE_PORT: database.instanceEndpoint.port.toString(),  // Asegúrate de que el puerto sea un string
        DATABASE_NAME: DATABASE_NAME,
        DATABASE_USER: 'usuario_api',
        DATABASE_PASSWORD: 'ABCD12345', 
      },
    };

    const depositarDineroLambda = new lambda.Function(this, 'DepositarDineroLambda', lambdaOptions);
    const retirarDineroLambda = new lambda.Function(this, 'RetirarDineroLambda', lambdaOptions);
    const cambiarClaveLambda = new lambda.Function(this, 'CambiarClaveLambda', lambdaOptions);

    const policyStatement: PolicyStatement = {
      effect: iam.Effect.ALLOW,
      actions: ['rds:Connect'],
      resources: [database.instanceArn],
    };

    depositarDineroLambda.addToRolePolicy(new iam.PolicyStatement(policyStatement));
    retirarDineroLambda.addToRolePolicy(new iam.PolicyStatement(policyStatement));
    cambiarClaveLambda.addToRolePolicy(new iam.PolicyStatement(policyStatement));

    // Integraciones de las funciones Lambda con API Gateway
    const depositarIntegration = new apigateway.LambdaIntegration(depositarDineroLambda);
    api.root.addResource('depositar').addMethod('POST', depositarIntegration);

    const retirarIntegration = new apigateway.LambdaIntegration(retirarDineroLambda);
    api.root.addResource('retirar').addMethod('POST', retirarIntegration);

    const cambiarClaveIntegration = new apigateway.LambdaIntegration(cambiarClaveLambda);
    api.root.addResource('cambiar_clave').addMethod('POST', cambiarClaveIntegration);
  }
}

const app = new App();
new BancariaApiStack(app, 'BancariaApiStack');

app.synth();
