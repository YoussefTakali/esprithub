package tn.esprithub.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;
import tn.esprithub.server.common.enums.UserRole;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedUsers();
        } else {
            // Ensure Youssef.Takali admin exists even if other users exist
            ensureAdminExists();
        }
        // Always ensure Aicha user exists
        ensureAichaExists();
    }

    private void ensureAdminExists() {
        String adminEmail = "Youssef.Takali@esprit.tn";
        if (!userRepository.existsByEmail(adminEmail)) {
            log.info("Creating admin user: {}", adminEmail);
            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode("youssef123"))
                    .firstName("Youssef")
                    .lastName("Takali")
                    .role(UserRole.ADMIN)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build();
            userRepository.save(admin);
            log.info("Admin user created successfully: {}", adminEmail);
        } else {
            log.info("Admin user already exists: {}", adminEmail);
        }
    }

    private void ensureAichaExists() {
        String aichaEmail = "aicha.benromdhane@esprit.tn";
        if (!userRepository.existsByEmail(aichaEmail)) {
            log.info("Creating chief user: {}", aichaEmail);
            User aicha = User.builder()
                    .email(aichaEmail)
                    .password(passwordEncoder.encode("aicha123"))
                    .firstName("Aicha")
                    .lastName("Ben Romdhane")
                    .role(UserRole.CHIEF)
                    .isActive(true)
                    .isEmailVerified(true)
                    .build();
            userRepository.save(aicha);
            log.info("Chief user created successfully: {}", aichaEmail);
        } else {
            log.info("Chief user already exists: {}", aichaEmail);
        }
    }

    private void seedUsers() {
        log.info("Seeding test users...");

        List<User> users = List.of(
                // Admin user
                User.builder()
                        .email("admin@esprit.tn")
                        .password(passwordEncoder.encode("admin123"))
                        .firstName("Admin")
                        .lastName("System")
                        .role(UserRole.ADMIN)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build(),

                // Chief user
                User.builder()
                        .email("chief@esprit.tn")
                        .password(passwordEncoder.encode("chief123"))
                        .firstName("Department")
                        .lastName("Chief")
                        .role(UserRole.CHIEF)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build(),

                // Teacher user
                User.builder()
                        .email("teacher@esprit.tn")
                        .password(passwordEncoder.encode("teacher123"))
                        .firstName("John")
                        .lastName("Teacher")
                        .role(UserRole.TEACHER)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build(),

                // Student user
                User.builder()
                        .email("student@esprit.tn")
                        .password(passwordEncoder.encode("student123"))
                        .firstName("Jane")
                        .lastName("Student")
                        .role(UserRole.STUDENT)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build(),

                // Additional test users
                User.builder()
                        .email("teacher2@esprit.tn")
                        .password(passwordEncoder.encode("teacher123"))
                        .firstName("Sarah")
                        .lastName("Professor")
                        .role(UserRole.TEACHER)
                        .isActive(true)
                        .isEmailVerified(true)
                        .githubUsername("sarah-prof")
                        .githubToken("fake_github_token_for_testing")
                        .build(),

                User.builder()
                        .email("aicha.benromdhane@esprit.tn")
                        .password(passwordEncoder.encode("aicha123"))
                        .firstName("Aicha")
                        .lastName("Ben Romdhane")
                        .role(UserRole.CHIEF)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build(),

                // Youssef Takali user
                User.builder()
                        .email("Youssef.Takali@esprit.tn")
                        .password(passwordEncoder.encode("youssef123"))
                        .firstName("Youssef")
                        .lastName("Takali")
                        .role(UserRole.CHIEF)
                        .isActive(true)
                        .isEmailVerified(true)
                        .build()
        );

        userRepository.saveAll(users);
        log.info("Seeded {} test users successfully", users.size());
        
        // Log credentials for testing
        log.info("=== TEST CREDENTIALS ===");
        log.info("🔑 ADMIN: Youssef.Takali@esprit.tn / youssef123");
        log.info("Admin: admin@esprit.tn / admin123");
        log.info("Chief: chief@esprit.tn / chief123");
        log.info("Teacher: teacher@esprit.tn / teacher123");
        log.info("Student: student@esprit.tn / student123");
        log.info("Teacher with GitHub: teacher2@esprit.tn / teacher123");
        log.info("Student 2: student2@esprit.tn / student123");
        log.info("========================");
    }
}
