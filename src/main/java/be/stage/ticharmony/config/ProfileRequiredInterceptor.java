package be.stage.ticharmony.config;

import be.stage.ticharmony.controller.ProfileController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ProfileRequiredInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return true;

        boolean isClient = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CLIENT"));
        if (!isClient) return true;

        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(ProfileController.SESSION_PROFILE_KEY) == null) {
            response.sendRedirect(request.getContextPath() + "/select-profile");
            return false;
        }
        return true;
    }
}