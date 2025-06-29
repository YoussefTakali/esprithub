package tn.esprithub.server.security.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.Customizer;
import tn.esprithub.server.config.properties.CorsProperties;
import tn.esprithub.server.security.filter.JwtAuthenticationFilter;

import java.util.Arrays;

import static tn.esprithub.server.security.constants.SecurityConstants.*;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsProperties corsProperties;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig::deny)
                        .contentTypeOptions(Customizer.withDefaults())
                        .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                                .maxAgeInSeconds(31536000)
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints (no authentication required)
                        .requestMatchers(
                                "/api/v1/auth/login", "/api/v1/auth/refresh",
                                "/api/v1/health",
                                "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health",
                                "/api/v1/github/auth-url",
                                "/error"
                        ).permitAll()
                        
                        // Allow all OPTIONS requests (CORS preflight)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // GitHub and other auth endpoints (require authentication)
                        .requestMatchers("/api/v1/auth/**", "/api/v1/github/**").authenticated()

                        // Admin only endpoints
                        .requestMatchers(ADMIN_ENDPOINTS).hasRole(ROLE_ADMIN)

                        // Chief only endpoints
                        .requestMatchers(CHIEF_ENDPOINTS).hasAnyRole(ROLE_ADMIN, ROLE_CHIEF)

                        // Teacher endpoints
                        .requestMatchers("/api/teacher/**").hasAnyRole(ROLE_ADMIN, ROLE_CHIEF, ROLE_TEACHER)
                        .requestMatchers("/api/projects/**").hasAnyRole(ROLE_ADMIN, ROLE_CHIEF, ROLE_TEACHER)
                        .requestMatchers("/api/groups/**").hasAnyRole(ROLE_ADMIN, ROLE_CHIEF, ROLE_TEACHER)
                        .requestMatchers("/api/tasks/**").hasAnyRole(ROLE_ADMIN, ROLE_CHIEF, ROLE_TEACHER)
                        // Allow teachers to fetch users for collaborators
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/**").hasAnyRole(ROLE_ADMIN, ROLE_CHIEF, ROLE_TEACHER)

                        // All other requests require authentication
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Note: DaoAuthenticationProvider is deprecated in newer Spring Security versions
    // but still functional. For production, consider using newer authentication mechanisms.
    @Bean
    @SuppressWarnings("deprecation")
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(corsProperties.getAllowedOrigins().split(",")));
        configuration.setAllowedMethods(Arrays.asList(corsProperties.getAllowedMethods().split(",")));
        configuration.setAllowedHeaders(Arrays.asList(corsProperties.getAllowedHeaders().split(",")));
        configuration.setAllowCredentials(corsProperties.isAllowCredentials());
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
