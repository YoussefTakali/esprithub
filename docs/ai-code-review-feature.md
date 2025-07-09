# Assistant de Code Review IA - Documentation

## Vue d'ensemble

L'Assistant de Code Review IA est une fonctionnalité avancée qui utilise l'intelligence artificielle pour analyser automatiquement le code soumis et fournir des suggestions d'amélioration, détecter des bugs potentiels et recommander des bonnes pratiques.

## Fonctionnalités

### 🔍 Analyse automatique du code
- **Analyse de fichiers complets** : Analyse complète d'un fichier de code
- **Analyse de blocs de code** : Analyse de portions de code spécifiques
- **Analyse de diffs** : Analyse des changements dans les pull requests
- **Support multi-langages** : Java, Python, JavaScript, C++, C#, PHP, Ruby, Go, Rust, etc.

### 🐛 Détection de bugs potentiels
- **Bugs logiques** : Détection d'erreurs de logique courantes
- **Problèmes de sécurité** : Vulnérabilités SQL injection, XSS, etc.
- **Problèmes de performance** : Optimisations possibles
- **Problèmes de style** : Conformité aux standards de codage

### 💡 Suggestions d'amélioration
- **Refactoring** : Suggestions de restructuration du code
- **Optimisations** : Améliorations de performance
- **Bonnes pratiques** : Recommandations de patterns
- **Documentation** : Suggestions d'amélioration de la documentation

### 📊 Évaluation de qualité
- **Score global** : Évaluation de 1 à 10
- **Analyse détaillée** : Rapport complet avec catégorisation
- **Métriques** : Temps d'analyse, nombre d'issues, etc.

## Architecture

### Services principaux

#### 1. CodeReviewService
```java
@Service
public class CodeReviewService {
    // Analyse de code avec OpenAI
    public CodeReviewResult analyzeCode(String code, String language, String context)
    
    // Analyse de diff
    public CodeReviewResult analyzeDiff(String diff, String language)
    
    // Analyse de fichier complet
    public CodeReviewResult analyzeFile(String fileName, String fileContent, String language)
}
```

#### 2. CodeReviewNotificationService
```java
@Service
public class CodeReviewNotificationService {
    // Analyse et notification
    public void analyzeAndNotify(String code, String language, String context, 
                                List<User> recipients, String repositoryName, String fileName)
    
    // Analyse de diff et notification
    public void analyzeDiffAndNotify(String diff, String language, List<User> recipients, 
                                   String repositoryName, String pullRequestTitle)
}
```

### Modèles de données

#### CodeReviewResult
```java
@Data
@Builder
public class CodeReviewResult {
    private boolean success;
    private String message;
    private Integer overallScore; // 1-10
    private String summary;
    private List<String> strengths;
    private List<CodeIssue> issues;
    private List<CodeSuggestion> suggestions;
    private List<String> securityConcerns;
    private List<String> performanceTips;
    private List<String> bestPractices;
}
```

#### CodeIssue
```java
@Data
@Builder
public static class CodeIssue {
    private CodeIssueType type; // BUG, SECURITY, PERFORMANCE, STYLE, MAINTAINABILITY
    private IssueSeverity severity; // LOW, MEDIUM, HIGH, CRITICAL
    private String line;
    private String description;
    private String suggestion;
}
```

## API Endpoints

### Analyse de code
```http
POST /api/ai/code-review/analyze
Content-Type: application/json

{
    "code": "public class Test { ... }",
    "language": "java",
    "context": "Test class for analysis"
}
```

### Analyse de diff
```http
POST /api/ai/code-review/analyze-diff
Content-Type: application/json

{
    "diff": "diff --git a/file.java b/file.java...",
    "language": "java"
}
```

### Analyse avec notification
```http
POST /api/ai/code-review/analyze-and-notify
Content-Type: application/json

{
    "code": "public class Test { ... }",
    "language": "java",
    "context": "Test class",
    "recipientIds": [1, 2, 3],
    "repositoryName": "my-repo",
    "fileName": "Test.java"
}
```

### Tests
```http
POST /api/ai/test/code-analysis
POST /api/ai/test/diff-analysis
POST /api/ai/test/file-analysis
POST /api/ai/test/analysis-with-notification?recipientIds=1,2,3
POST /api/ai/test/multi-language-test
POST /api/ai/test/performance-test
```

## Configuration

### Variables d'environnement
```properties
# Clé API OpenAI (requise)
OPENAI_API_KEY=your-openai-api-key

# Configuration de l'IA
app.ai.openai.api-key=${OPENAI_API_KEY:}
app.ai.openai.model=gpt-3.5-turbo
app.ai.code-review.enabled=true
app.ai.code-review.auto-analyze=true
app.ai.code-review.notify-on-issues=true
```

### Configuration des notifications
```properties
# Notifications par email
app.notifications.email.enabled=true

# Notifications Teams
app.notifications.teams.enabled=true
app.notifications.teams.webhook-url=${TEAMS_WEBHOOK_URL:}
```

## Intégration avec GitHub

### Webhooks automatiques
L'Assistant IA s'intègre automatiquement avec les webhooks GitHub :

1. **Push events** : Analyse automatique des fichiers modifiés
2. **Pull Request events** : Analyse des diffs
3. **Issue events** : Analyse du contexte

### Détection de langages
```java
private String getLanguageFromFileName(String fileName) {
    if (fileName.endsWith(".java")) return "java";
    if (fileName.endsWith(".py")) return "python";
    if (fileName.endsWith(".js")) return "javascript";
    // ... autres langages
}
```

## Utilisation

### 1. Configuration initiale
```bash
# Définir la clé API OpenAI
export OPENAI_API_KEY="your-api-key"

# Démarrer l'application
./mvnw spring-boot:run
```

### 2. Test de base
```bash
# Test d'analyse de code
curl -X POST http://localhost:8090/api/ai/test/code-analysis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Analyse avec notification
```bash
# Analyser et notifier
curl -X POST http://localhost:8090/api/ai/code-review/analyze-and-notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "public class Test { public int add(int a, int b) { return a + b; } }",
    "language": "java",
    "context": "Test class",
    "recipientIds": [1],
    "repositoryName": "test-repo",
    "fileName": "Test.java"
  }'
```

## Exemples de résultats

### Analyse réussie
```json
{
  "success": true,
  "overallScore": 7,
  "summary": "Code de bonne qualité avec quelques améliorations possibles",
  "strengths": [
    "Méthodes bien nommées",
    "Structure claire"
  ],
  "issues": [
    {
      "type": "SECURITY",
      "severity": "MEDIUM",
      "line": "15",
      "description": "Division par zéro possible",
      "suggestion": "Ajouter une vérification pour b != 0"
    }
  ],
  "suggestions": [
    {
      "category": "IMPROVEMENT",
      "description": "Ajouter des commentaires Javadoc",
      "priority": "LOW"
    }
  ]
}
```

### Analyse avec erreur
```json
{
  "success": false,
  "message": "AI analysis not available - API key not configured"
}
```

## Sécurité

### Authentification
- Tous les endpoints nécessitent une authentification JWT
- Rôles requis : STUDENT, TEACHER, CHIEF, ADMIN
- Tests réservés aux administrateurs

### Validation des données
- Validation des entrées utilisateur
- Limitation de la taille des fichiers
- Sanitisation du code analysé

### Protection API
- Rate limiting recommandé
- Validation des clés API
- Logs de sécurité

## Monitoring et logs

### Logs d'analyse
```java
log.info("Starting AI code analysis for file: {} in repository: {}", fileName, repositoryName);
log.info("AI analysis completed for file: {} - Score: {}/10", fileName, result.getOverallScore());
log.warn("AI analysis failed for file: {} - {}", fileName, result.getMessage());
```

### Métriques
- Temps d'analyse
- Taux de succès
- Nombre d'analyses par jour
- Langages les plus analysés

## Développement

### Ajout de nouveaux langages
1. Ajouter l'extension dans `isCodeFile()`
2. Ajouter le mapping dans `getLanguageFromFileName()`
3. Tester avec des exemples de code

### Personnalisation des prompts
Modifier les méthodes de construction de prompts :
- `buildCodeReviewPrompt()`
- `buildDiffReviewPrompt()`
- `buildFileReviewPrompt()`

### Extension des notifications
Ajouter de nouveaux canaux dans `CodeReviewNotificationService` :
- Slack
- Discord
- Webhooks personnalisés

## Dépannage

### Problèmes courants

#### 1. Clé API manquante
```
Error: AI analysis not available - API key not configured
```
**Solution** : Définir `OPENAI_API_KEY` dans les variables d'environnement

#### 2. Timeout d'analyse
```
Error: Request timeout
```
**Solution** : Augmenter les timeouts dans la configuration WebClient

#### 3. Erreur de parsing JSON
```
Error: Error parsing AI response
```
**Solution** : Vérifier la réponse de l'API OpenAI

### Logs de débogage
```properties
logging.level.tn.esprithub.server.ai=DEBUG
logging.level.tn.esprithub.server.notification=DEBUG
```

## Roadmap

### Fonctionnalités futures
- [ ] Support de plus de langages
- [ ] Analyse de code legacy
- [ ] Suggestions de refactoring automatique
- [ ] Intégration avec les IDE
- [ ] Analyse de performance en temps réel
- [ ] Détection de patterns anti-patterns
- [ ] Suggestions de tests unitaires
- [ ] Analyse de couverture de code

### Améliorations techniques
- [ ] Cache des analyses
- [ ] Analyse asynchrone
- [ ] Support de modèles locaux
- [ ] Intégration avec d'autres IA
- [ ] API GraphQL
- [ ] WebSocket pour les analyses en temps réel 