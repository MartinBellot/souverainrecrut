// ======================================================
// Pipeline CI — Backend SouverainRecrut
//
// Checkout Dev → npm ci → Prisma generate → tests + couverture
// → analyse SonarQube → Quality Gate → image Docker → scan Trivy
// → publication sur Docker Hub (uniquement si tout est vert).
//
// Prérequis Jenkins (cf. ci/jenkins/casc.yaml) :
//   - serveur SonarQube "SonarQube" + outil "SonarScanner"
//   - credentials "dockerhub-credentials" (user + access token)
// ======================================================
pipeline {
  agent any

  options {
    skipDefaultCheckout()
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    booleanParam(name: 'PUBLISH', defaultValue: true,
      description: "Publier l'image si tous les contrôles passent")
    string(name: 'REGISTRY', defaultValue: '',
      description: 'Registre cible (vide = Docker Hub)')
    string(name: 'TARGET_PLATFORM', defaultValue: 'linux/amd64',
      description: "Architecture de l'image = celle du serveur de déploiement (le VPS est en amd64)")
  }

  environment {
    IMAGE_NAME = 'souverainrecrut-backend'

    // ---- Seuils Trivy -------------------------------------------------
    // Bloquant : toute vulnérabilité HIGH ou CRITICAL disposant d'un correctif,
    //            et tout secret détecté dans l'image.
    // Non bloquant : MEDIUM / LOW et vulnérabilités sans correctif (rapport archivé).
    // Exceptions justifiées, ciblées et datées : backend/.trivyignore.yaml
    TRIVY_BLOCKING_SEVERITY = 'HIGH,CRITICAL'
    TRIVY_CACHE_DIR = "${JENKINS_HOME}/.cache/trivy"

    // Pas de prompts ni de bruit npm en CI
    CI = 'true'
    npm_config_fund = 'false'
    npm_config_audit = 'false'
  }

  stages {
    stage('Checkout Dev') {
      steps {
        checkout scmGit(
          branches: [[name: '*/Dev']],
          userRemoteConfigs: scm.userRemoteConfigs
        )
        script {
          env.GIT_COMMIT_FULL = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
          env.GIT_SHORT = env.GIT_COMMIT_FULL.take(7)
          env.APP_VERSION = sh(script: "node -p \"require('./backend/package.json').version\"", returnStdout: true).trim()
          // Tag traçable : version applicative + commit (ex. 1.0.0-d794c86)
          env.VERSION_TAG = "${env.APP_VERSION}-${env.GIT_SHORT}"
          env.IMAGE_TAG = "${env.IMAGE_NAME}:${env.VERSION_TAG}"
          currentBuild.description = env.VERSION_TAG
        }
      }
    }

    stage('Install') {
      steps {
        dir('backend') {
          sh 'node --version && npm --version'
          sh 'npm ci'
        }
      }
    }

    stage('Prisma generate') {
      steps {
        dir('backend') {
          sh 'npx prisma generate'
        }
      }
    }

    stage('Tests') {
      steps {
        dir('backend') {
          sh 'npm run typecheck'
          // Tests unitaires + intégration, couverture lcov + rapports JUnit / Sonar
          sh 'npm run test:ci'
        }
      }
      post {
        always {
          junit testResults: 'backend/reports/junit.xml', allowEmptyResults: false
          publishHTML(target: [
            reportName: 'Couverture',
            reportDir: 'backend/coverage/lcov-report',
            reportFiles: 'index.html',
            keepAll: true,
            alwaysLinkToLastBuild: true,
            allowMissing: true,
          ])
        }
      }
    }

    stage('SonarQube analysis') {
      steps {
        dir('backend') {
          withSonarQubeEnv('SonarQube') {
            sh "${tool 'SonarScanner'}/bin/sonar-scanner -Dsonar.projectVersion=${env.VERSION_TAG}"
          }
        }
      }
    }

    stage('Quality Gate') {
      steps {
        // Attend le webhook SonarQube → Jenkins ; échoue si le gate n'est pas PASSED.
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build image') {
      steps {
        // retry : absorbe les erreurs réseau passagères vers le registre
        retry(2) {
          sh """
            docker build --pull --platform ${params.TARGET_PLATFORM} \
              --build-arg VERSION=${env.APP_VERSION} \
              --build-arg REVISION=${env.GIT_COMMIT_FULL} \
              -t ${env.IMAGE_TAG} backend
          """
        }
        sh "docker image ls ${env.IMAGE_NAME}"
      }
    }

    stage('Trivy scan') {
      steps {
        // 1. Rapport complet (toutes sévérités + secrets), archivé, non bloquant
        retry(2) {
          sh """
            trivy image --cache-dir "${TRIVY_CACHE_DIR}" --no-progress --skip-version-check \
              --scanners vuln,secret --format json --output trivy-report.json \
              ${env.IMAGE_TAG}
          """
        }
        sh 'trivy convert --format table --output trivy-report.txt trivy-report.json'

        // 2. Contrôle bloquant selon les seuils retenus
        sh """
          trivy image --cache-dir "${TRIVY_CACHE_DIR}" --no-progress --skip-version-check --skip-db-update \
            --scanners vuln,secret \
            --severity ${TRIVY_BLOCKING_SEVERITY} --ignore-unfixed \
            --ignorefile backend/.trivyignore.yaml \
            --exit-code 1 \
            ${env.IMAGE_TAG}
        """
      }
      post {
        always {
          archiveArtifacts artifacts: 'trivy-report.*', allowEmptyArchive: true
        }
      }
    }

    stage('Publish') {
      when {
        allOf {
          expression { params.PUBLISH }
          expression { currentBuild.currentResult == 'SUCCESS' }
        }
      }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKERHUB_USERNAME',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          // Guillemets simples : les secrets ne sont jamais interpolés par Groovy.
          sh '''
            set -eu
            REPO="${REGISTRY:+$REGISTRY/}$DOCKERHUB_USERNAME/$IMAGE_NAME"

            echo "$DOCKERHUB_TOKEN" | docker login ${REGISTRY:-} -u "$DOCKERHUB_USERNAME" --password-stdin

            # <version>-<commit> : immuable et traçable ; dev : dernière image validée de la branche Dev
            for tag in "$VERSION_TAG" dev; do
              docker tag "$IMAGE_TAG" "$REPO:$tag"
              docker push "$REPO:$tag"
            done

            docker image ls "$REPO"
            docker image rm "$REPO:$VERSION_TAG" "$REPO:dev"
            echo "Image publiée : $REPO:$VERSION_TAG"
          '''
        }
      }
      post {
        always {
          sh 'docker logout ${REGISTRY:-} || true'
        }
      }
    }
  }

  post {
    always {
      // Libère l'espace disque de l'hôte Docker
      sh "docker image rm -f ${env.IMAGE_TAG} || true"
      cleanWs()
    }
    success {
      echo "✅ Pipeline réussi — image ${env.IMAGE_TAG}"
    }
    failure {
      echo '❌ Pipeline en échec — image non publiée.'
    }
  }
}
