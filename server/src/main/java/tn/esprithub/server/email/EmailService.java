package tn.esprithub.server.email;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendCredentialsEmail(String to, String username, String password) {
        System.out.println("Tentative d'envoi d'email à : " + to);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

           String htmlContent =
    "<!DOCTYPE html>" +
    "<html lang=\"fr\">" +
    "<head>" +
    "  <meta charset=\"UTF-8\">" +
    "  <style>" +
    "    body { font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; }" +
    "    .container { background-color: #ffffff; max-width: 600px; margin: 30px auto; padding: 20px; border-radius: 8px; }" +
    "    .header { background-color: #a71617; color: white; padding: 20px; text-align: center; }" +
    "    .credentials { background-color: #f1f1f1; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace; }" +
    "    .footer { background-color: #fafafa; color: #888888; text-align: center; padding: 15px; font-size: 12px; }" +
    "  </style>" +
    "</head>" +
    "<body>" +
    "  <div class=\"container\">" +
    "    <div class=\"header\"><h1>Bienvenue sur espritHUb</h1></div>" +
    "    <p>Bonjour,</p>" +
    "    <p>Votre compte a été créé avec succès. Voici vos identifiants :</p>" +
    "    <div class=\"credentials\">" +
    "      <p><strong>Email :</strong> " + to + "</p>" +
    "      <p><strong>Nom d'utilisateur :</strong> " + username + "</p>" +
    "      <p><strong>Mot de passe :</strong> " + password + "</p>" +
    "    </div>" +
    "    <p>Merci et bienvenue !</p>" +
    "    <div class=\"footer\">&copy; 2025 espriHUb. Tous droits réservés.</div>" +
    "  </div>" +
    "</body>" +
    "</html>";

            helper.setTo(to);
            helper.setSubject("Vos identifiants de connexion - espriHUb");
            helper.setText(htmlContent, true); // true = contenu HTML

            mailSender.send(message);
            System.out.println("Email HTML envoyé !");
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email : " + e.getMessage());
        }
    }
}
