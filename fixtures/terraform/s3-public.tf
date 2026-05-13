resource "aws_s3_bucket" "public_bucket" {
  bucket = "my-public-bucket-12345"

  versioning {
    enabled = false
  }

  logging {
    target_bucket = "${aws_s3_bucket.logging_bucket.id}"
    target_prefix = "log/"
  }

  lifecycle_rule {
    enabled = true
    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.public_bucket.id
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-public-bucket-12345/*"
    }
  ]
}
EOF
}

resource "aws_s3_bucket" "logging_bucket" {
  bucket = "my-logging-bucket-67890"
}