variable "server_name" {
  description = "Nom logique du serveur de déploiement"
  type        = string
  default     = "souverainrecrut-vps"
}

variable "server_ip" {
  description = "Adresse IP publique du VPS"
  type        = string
  default     = "148.230.115.48"

  validation {
    condition     = can(regex("^\\d{1,3}(\\.\\d{1,3}){3}$", var.server_ip))
    error_message = "server_ip doit être une adresse IPv4."
  }
}

variable "admin_user" {
  description = "Utilisateur SSH d'administration (utilisé par Terraform et Ansible)"
  type        = string
  default     = "root"
}

variable "admin_ssh_private_key_path" {
  description = "Clé privée SSH de l'administrateur (jamais versionnée)"
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "use_ssh_agent" {
  description = "Utiliser l'agent SSH (clé d'administration protégée par passphrase)"
  type        = bool
  default     = true
}

variable "deploy_user" {
  description = "Utilisateur système utilisé par GitLab CI pour déployer"
  type        = string
  default     = "deploy"
}

variable "deploy_dir" {
  description = "Répertoire de déploiement sur le serveur"
  type        = string
  default     = "/opt/souverainrecrut"
}

variable "api_port" {
  description = "Port public de l'API Backend"
  type        = number
  default     = 4000

  validation {
    condition     = var.api_port > 1024 && var.api_port < 65536
    error_message = "api_port doit être un port non privilégié."
  }
}

variable "backend_image" {
  description = "Dépôt Docker Hub de l'image Backend"
  type        = string
  default     = "martinbellot/souverainrecrut-backend"
}

variable "image_tag" {
  description = "Tag de l'image Backend déployée initialement par Ansible"
  type        = string
  default     = "dev"
}
