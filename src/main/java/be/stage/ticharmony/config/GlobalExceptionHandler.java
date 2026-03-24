package be.stage.ticharmony.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthorizationDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String handleAccessDenied(HttpServletRequest request, Model model) {
        log.warn("Accès refusé sur {} : droits insuffisants", request.getRequestURI());
        model.addAttribute("errorMessage", "Accès refusé");
        model.addAttribute("errorDetails", "Vous n'avez pas les droits pour effectuer cette action.");
        return "error/403";
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String handleNotFound(NoHandlerFoundException ex, HttpServletRequest request, Model model) {
        log.warn("Page non trouvée : {}", request.getRequestURI());
        model.addAttribute("errorMessage", "Page non trouvée");
        model.addAttribute("errorDetails", "La page demandée n'existe pas.");
        return "error/404";
    }

    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String handleNoResource(NoResourceFoundException ex, HttpServletRequest request, Model model) {
        // Ressource statique introuvable (ex: favicon.ico) — pas d'erreur à logger
        model.addAttribute("errorMessage", "Ressource introuvable");
        model.addAttribute("errorDetails", "La ressource demandée n'existe pas.");
        return "error/404";
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleGenericException(Exception ex, HttpServletRequest request, Model model) {
        log.error("Erreur interne sur {} : {}", request.getRequestURI(), ex.getMessage(), ex);
        model.addAttribute("errorMessage", "Une erreur s'est produite");
        model.addAttribute("errorDetails", "Veuillez contacter l'administrateur.");
        model.addAttribute("path", request.getRequestURI());
        return "error/500";
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request, Model model) {
        log.warn("Requête invalide sur {} : {}", request.getRequestURI(), ex.getMessage());
        model.addAttribute("errorMessage", "Requête invalide");
        model.addAttribute("errorDetails", "Les données envoyées sont incorrectes.");
        return "error/400";
    }
}
