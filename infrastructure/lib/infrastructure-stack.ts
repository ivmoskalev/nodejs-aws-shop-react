import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create an Origin Access Identity for CloudFront
        const cloudFrontOAI = new cloudfront.OriginAccessIdentity(this, "CloudFrontOAI", {});

        // Create an S3 bucket for website hosting
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
            bucketName: "node-aws-shop-react-website",
            websiteIndexDocument: "index.html",
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // Define a CloudFront distribution with S3 as the origin
        const distribution = new cloudfront.Distribution(this, "WebsiteDistribution", {
            defaultRootObject: "index.html",
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    ttl: cdk.Duration.seconds(30),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    ttl: cdk.Duration.seconds(30),
                },
            ],
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
                compress: true,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
        });

        // Deploy the built React app to the S3 bucket and trigger CloudFront invalidation
        new s3deploy.BucketDeployment(this, "DeployWebsite", {
            sources: [s3deploy.Source.asset("../dist")],
            destinationBucket: websiteBucket,
            distribution: distribution,
            distributionPaths: ["/*"],
        });

        // Output the CloudFront URL for convenience
        new cdk.CfnOutput(this, "CloudFrontURL", {
            value: distribution.distributionDomainName,
        });
    }
}
