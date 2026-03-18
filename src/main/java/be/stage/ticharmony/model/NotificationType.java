package be.stage.ticharmony.model;

public enum NotificationType {
    NEW_PROBLEM("Nouveau ticket créé"),
    PROBLEM_CLOSED("Ticket résolu"),
    ASSIGNED_TO_PROBLEM("Vous avez été assigné au ticket"),
    NEW_COMMENT("Nouveau message"),
    TICKET_IN_PROGRESS("Ticket pris en charge"),
    TICKET_CLOSED("Dossier clôturé"),
    TICKET_REASSIGNED("Ticket réassigné");

    private final String label;

    NotificationType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
