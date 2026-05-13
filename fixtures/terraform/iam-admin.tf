resource "aws_iam_user" "admin_user" {
  name = "admin-user"
}

resource "aws_iam_access_key" "admin_key" {
  user = aws_iam_user.admin_user.name
}

resource "aws_iam_user_policy" "admin_policy" {
  name = "AdminAccess"
  user = aws_iam_user.admin_user.name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_group" "admins" {
  name = "admins"
}

resource "aws_iam_group_policy_attachment" "admins_admin" {
  group      = aws_iam_group.admins.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}