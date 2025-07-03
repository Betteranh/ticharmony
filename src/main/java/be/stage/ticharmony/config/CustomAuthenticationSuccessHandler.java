package be.stage.ticharmony.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.util.Set;

public class CustomAuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        Set<String> roles = AuthorityUtils.authorityListToSet(authentication.getAuthorities());
        if (roles.contains("ROLE_CLIENT")) {
            response.sendRedirect(request.getContextPath() + "/clientDashboard");
        } else if (roles.contains("ROLE_ADMIN")) {
            response.sendRedirect(request.getContextPath() + "/adminDashboard");
        } else if (roles.contains("ROLE_MEMBER")) {
            response.sendRedirect(request.getContextPath() + "/memberDashboard");
        } else {
            // fallback, on redirige vers l'accueil ou une page d'erreur
            response.sendRedirect(request.getContextPath() + "/");
        }
    }
}
