"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_cdk_lib_1 = require("aws-cdk-lib");
const lambda = require("@aws-cdk/aws-lambda");
const apigateway = require("@aws-cdk/aws-apigateway");
const rds = require("@aws-cdk/aws-rds");
const iam = require("@aws-cdk/aws-iam");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const DATABASE_NAME = 'bancosegurodb';
const API_NAME = 'BancariaApi';
const LAMBDA_HANDLER = 'lambda/index.handler';
const LAMBDA_CODE = lambda.Code.fromAsset('lambda');
const LAMBDA_MEMORY_SIZE = 128;
const LAMBDA_TIMEOUT = aws_cdk_lib_2.Duration.seconds(30);
class BancariaApiStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const databaseOptions = {
            engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.V8_0 }),
            instanceType: rds.InstanceType.of(rds.InstanceClass.BURSTABLE2, rds.InstanceSize.SMALL),
            deleteAutomatedBackups: true,
        };
        const database = new rds.DatabaseInstance(this, 'bancosegurodb', databaseOptions);
        const apiGatewayOptions = {
            restApiName: API_NAME,
            deployOptions: {
                stageName: 'prod',
            },
        };
        const api = new apigateway.RestApi(this, API_NAME, apiGatewayOptions);
        const lambdaOptions = {
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: LAMBDA_HANDLER,
            code: LAMBDA_CODE,
            memorySize: LAMBDA_MEMORY_SIZE,
            timeout: LAMBDA_TIMEOUT,
            environment: {
                DATABASE_HOST: database.dbInstanceEndpoint.hostname,
                DATABASE_PORT: database.dbInstanceEndpoint.port,
                DATABASE_NAME: DATABASE_NAME,
                DATABASE_USER: 'usuario_api',
                DATABASE_PASSWORD: 'ABCD12345',
            },
        };
        const depositarDineroLambda = new lambda.Function(this, 'DepositarDineroLambda', lambdaOptions);
        const retirarDineroLambda = new lambda.Function(this, 'RetirarDineroLambda', lambdaOptions);
        const cambiarClaveLambda = new lambda.Function(this, 'CambiarClaveLambda', lambdaOptions);
        const policyStatement = {
            effect: iam.Effect.ALLOW,
            actions: ['rds:DescribeDBInstances', 'rds:DescribeDBSecurityGroups'],
            resources: [database.dbInstanceArn],
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
const app = new aws_cdk_lib_1.App();
new BancariaApiStack(app, 'BancariaApiStack');
app.synth();
