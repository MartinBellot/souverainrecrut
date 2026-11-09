output "server_ip" {
  description = "Adresse IP du serveur"
  value       = var.server_ip
}

output "api_url" {
  description = "URL publique de l'API après déploiement"
  value       = "http://${var.server_ip}:${var.api_port}/v1"
}

output "ansible_command" {
  description = "Commande de configuration du serveur"
  value       = "cd ansible && ansible-playbook -i inventory.ini playbook.yml"
}

output "deploy_user" {
  description = "Utilisateur SSH à renseigner dans GitLab (SSH_USER)"
  value       = var.deploy_user
}

output "deploy_public_key" {
  description = "Clé publique installée par Ansible pour l'utilisateur de déploiement"
  value       = trimspace(tls_private_key.deploy.public_key_openssh)
}

output "deploy_private_key_path" {
  description = "Fichier local de la clé privée à copier dans GitLab (SSH_PRIVATE_KEY)"
  value       = abspath(local_sensitive_file.deploy_private_key.filename)
}
