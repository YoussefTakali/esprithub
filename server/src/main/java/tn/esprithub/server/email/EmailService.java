package tn.esprithub.server.email;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private JavaMailSender mailSender;

    public void sendCredentialsEmail(String to, String username, String password) {
        System.out.println("Tentative d'envoi d'email à : " + to);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Vos identifiants de connexion");
        message.setText("Bonjour,\n\nVotre compte a été créé avec succès.\n\nEmail: " + to + "\nMot de passe: " + password + "\n\nMerci.");
        try {
            mailSender.send(message);
            System.out.println("Email envoyé !");
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email ");

        }
    }
}
