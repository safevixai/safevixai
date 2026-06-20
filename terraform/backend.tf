terraform {
  backend "s3" {
    bucket         = "safevixai-terraform-state"
    key            = "safevixai/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "safevixai-terraform-locks"
  }
}
