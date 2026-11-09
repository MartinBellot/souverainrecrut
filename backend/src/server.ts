import app from "./app";
import { env, getMissingRequiredEnv } from "./config/env";

const missingEnv = getMissingRequiredEnv();

if (missingEnv.length > 0) {
  console.error(
    `❌ Variables d'environnement manquantes : ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

app.listen(env.port, () => {
  console.log("=================================");
  console.log("🚀 SouverainRecrut Backend");
  console.log(`🌍 Environment : ${env.nodeEnv}`);
  console.log(`📍 URL : http://localhost:${env.port}`);
  console.log(`📌 API Version : ${env.apiVersion}`);
  console.log("=================================");
});
