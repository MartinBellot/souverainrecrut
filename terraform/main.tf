locals {
  ansible_dir = "${path.module}/../ansible"
  secrets_dir = "${path.module}/.secrets"
}

# ------------------------------------------------------
# Clé SSH dédiée au déploiement (utilisateur "deploy", GitLab CI)
# La clé privée n'est écrite que localement (.secrets/, ignoré par git)
# puis copiée dans une variable protégée de GitLab.
# ------------------------------------------------------
resource "tls_private_key" "deploy" {
  algorithm = "ED25519"
}

resource "local_sensitive_file" "deploy_private_key" {
  content         = tls_private_key.deploy.private_key_openssh
  filename        = "${local.secrets_dir}/deploy_ed25519"
  file_permission = "0600"
}

resource "local_file" "deploy_public_key" {
  content         = tls_private_key.deploy.public_key_openssh
  filename        = "${local.secrets_dir}/deploy_ed25519.pub"
  file_permission = "0644"
}

# ------------------------------------------------------
# Vérification du serveur existant (lecture seule)
# ------------------------------------------------------
resource "null_resource" "server_check" {
  triggers = {
    server_ip = var.server_ip
  }

  connection {
    type = "ssh"
    host = var.server_ip
    user = var.admin_user
    # Clé protégée par passphrase → agent SSH ; sinon lecture directe du fichier.
    agent       = var.use_ssh_agent
    private_key = var.use_ssh_agent ? null : file(pathexpand(var.admin_ssh_private_key_path))
    timeout     = "30s"
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      ". /etc/os-release && echo \"OS          : $PRETTY_NAME\"",
      "echo \"Architecture: $(dpkg --print-architecture)\"",
      "echo \"IP          : $(hostname -I | cut -d' ' -f1)\"",
      "curl -fsS -o /dev/null --max-time 10 https://deb.debian.org && echo 'Internet    : OK'",
      "case \"$ID\" in debian|ubuntu) ;; *) echo \"OS non supporté : $ID\"; exit 1 ;; esac",
    ]
  }
}

# ------------------------------------------------------
# Passage de relais à Ansible : inventaire + variables générés
# ------------------------------------------------------
resource "local_file" "ansible_inventory" {
  filename        = "${local.ansible_dir}/inventory.ini"
  file_permission = "0644"
  content = templatefile("${path.module}/templates/inventory.ini.tftpl", {
    server_name                = var.server_name
    server_ip                  = var.server_ip
    admin_user                 = var.admin_user
    admin_ssh_private_key_path = var.admin_ssh_private_key_path
  })

  depends_on = [null_resource.server_check]
}

resource "local_file" "ansible_vars" {
  filename        = "${local.ansible_dir}/group_vars/souverainrecrut/terraform.yml"
  file_permission = "0644"
  content = templatefile("${path.module}/templates/terraform_vars.yml.tftpl", {
    deploy_user       = var.deploy_user
    deploy_dir        = var.deploy_dir
    api_port          = var.api_port
    backend_image     = var.backend_image
    image_tag         = var.image_tag
    deploy_public_key = trimspace(tls_private_key.deploy.public_key_openssh)
  })
}
