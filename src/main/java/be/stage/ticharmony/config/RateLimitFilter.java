package be.stage.ticharmony.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting par IP (fenêtre glissante, sans dépendance externe) :
 *  - /api/**     : 20 requêtes par minute
 *  - POST /login : 15 tentatives par minute (anti brute-force)
 */
@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int  API_LIMIT   = 20;
    private static final int  LOGIN_LIMIT = 15;
    private static final long WINDOW_MS   = 60_000L; // 1 minute

    private final Map<String, Deque<Long>> apiBuckets   = new ConcurrentHashMap<>();
    private final Map<String, Deque<Long>> loginBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String ip   = resolveClientIp(request);
        String path = request.getRequestURI();

        if (path.startsWith("/api/")) {
            if (!allow(apiBuckets, ip, API_LIMIT)) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"error\":\"Trop de requêtes. Veuillez réessayer dans quelques secondes.\",\"status\":429}");
                return;
            }
        } else if ("/login".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            if (!allow(loginBuckets, ip, LOGIN_LIMIT)) {
                response.sendRedirect("/login?rate=true");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Fenêtre glissante : conserve les timestamps des requêtes de l'IP
     * dans la dernière minute. Retourne true si la requête est autorisée.
     */
    private boolean allow(Map<String, Deque<Long>> buckets, String ip, int limit) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = buckets.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            // Supprimer les entrées hors fenêtre
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= limit) {
                return false;
            }
            timestamps.addLast(now);
            return true;
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}