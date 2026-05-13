resource "aws_db_instance" "unencrypted_db" {
  identifier           = "unencrypted-mysql"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_encrypted    = false
  publicly_accessible  = true
  skip_final_snapshot  = true
  deletion_protection  = false

  username = "admin"
  password = "MyP@ssw0rd123456"

  backup_retention_period = 0

  parameters {
    name  = "character_set_database"
    value = "utf8mb4"
  }
}