# Application Web de Gestion des Problèmes Informatiques

## Contexte du Projet

Ce projet a été réalisé dans le cadre d'un stage en entreprise chez **TIC Harmony**. Il s'agit d'une application web
destinée à la gestion des problèmes informatiques. L'application permet aux clients de s'inscrire, se connecter et
signaler les problèmes rencontrés avec leurs appareils, tandis que les techniciens se connectent pour consulter et
répondre aux signalements.

## Fonctionnalités Principales

- **Inscription et Authentification**  
  Permet aux clients de créer un compte et de se connecter.
- **Gestion des Signalements**  
  Les clients peuvent soumettre un formulaire décrivant le problème rencontré.
- **Interface Technicien**  
  Les techniciens se connectent pour consulter la liste des problèmes et y apporter une solution.
- **Documentation du Projet**  
  Le document d'analyse du projet, nommé **Analyse_Projet.docx**, est inclus dans le dossier `/docs`.

## Technologies et Outils Utilisés

- **Backend :**
    - Langage : Java
    - Framework : Spring Boot
    - Environnement de développement : IntelliJ IDEA
- **Base de Données :**
    - MySQL via Wampserver
- **Frontend :**
    - (Précisez ici les technologies front-end si applicable, par exemple HTML, CSS, JavaScript)

## Installation et Exécution

### Prérequis

- JDK 11 ou supérieur
- IntelliJ IDEA
- Wampserver (pour MySQL)
- Maven (ou Gradle, selon la configuration du projet)

### Instructions

1. **Cloner le dépôt :**
   ```bash
   git clone https://votre_url_du_depot.git
2. **Ouvrir le projet :**
   Importez le projet dans IntelliJ IDEA.
3. **Configurer la base de données :**
   Modifiez le fichier application.properties (ou application.yml) pour définir les paramètres de connexion à votre
   instance MySQL.
4. **Lancer l'application :**
   Via IntelliJ IDEA en exécutant la classe principale contenant la méthode main.
   Ou via Maven avec la commande :
   ```bash
   mvn spring-boot:run
5. **Accéder à l'application :**
   Ouvrez http://localhost:8080 dans votre navigateur.

### Documentation Complémentaire

Le fichier Analyse_Projet.docx se trouve dans le dossier /docs. Ce document fournit une analyse détaillée incluant :

- La définition et les objectifs du projet.
- L'analyse des besoins et l'architecture de l'application.
- Les choix technologiques et méthodologiques.

### Contact

Pour toute question, contactez-moi à [t.nguyen06@outlook.com]