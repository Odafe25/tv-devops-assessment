--------------------------------------------------
### NODE.JS EXPRESS APP
--------------------------------------------------
pre-Requisite: have docker instaled locally and open docker desktop or docker build will not start


The actual local Endpoint:
http://localhost:3000/health

OUTPUT: {"status":"ok"}

2. Added a health check to app.ts --> app.get('/health', (_, res) => res.status(200).send('OK lets go Turbovets'));  // added health check message to say OK lets go turbovets

--------------------------------------------------
### PART 2 - AWS INFRASTRUCTURE (CDKTF)
--------------------------------------------------
 Provisioned Resources using modules as instructed
- Alb.ts
- certificate.ts
- ecr.ts
- ecs.ts
- logging.ts
- vpc.tf

The .env.example has all the env that you would need to configure 
1. to connect to aws i used the iam user with command line acces to ensure an access key and secret access key that would allow the aws credentials step login in my ci-cd.yml in the repo. 
2. the second step would be to add these secrets to the githun at the repository level not the actions level
3. Now you are fully authenticated to your aws account 

#### Bonus Items requested
1. purchased domain odafeturbo25.com from go daddy
2. created hosted zone in route53 and added the nameservers to the dns settings in godaddy
3. provisioned s3 bucket in aws with dynamodb using the ci-cd.yml pipeline. i decided to use this approach to avoid any confusion between regular terraform deployment and the cdktf deployment. as you can see in my repo the file are available for a regular terraform deploy if needed to improve pipeline readability and maintaining control of the bucket configurations and dynamo db in the future.
4. I approcched this with full automation which led to complexity using strictly ci-cd.yml for the deployment. instead of taking the simple terminal deployment test approach.
5. i ran into issues with the cdktf infra-stack regarding arrays and especially the certificate.ts
6. implemented matrix deployment strategy in the ci-cd.yml to suppoer dev, staging and prod


--------------------------------------------------
### Part 3: GitHub Actions CI/CD
--------------------------------------------------
![CI/CD](https://github.com/odafe25/tv-devops-assessment/actions/workflows/ci-cd.yml/badge.svg)

📘 Instructions for Setting Up GitHub Secrets
To store sensitive data securely, go to your GitHub repo:

Navigate to Settings > Secrets and variables > Actions

Add the following secrets:

AWS_ACCESS_KEY_ID

AWS_SECRET_ACCESS_KEY

AWS_REGION

Navigate to Settings > Secrets and variables > Repo

Add the following variables:

AWS_REGION

DOMAIN_NAME

PROJECT_NAME

1. I added these to the repo and actions level and created 3 different environments with 
