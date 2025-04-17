package be.stage.ticharmony.model;

public enum NotificationType {
    NEW_PROBLEM("Nouveau ticket créé"),
    PROBLEM_CLOSED("Ticket résolu"),
    ASSIGNED_TO_PROBLEM("Vous avez été assigné au ticket");

    private final String label;

    NotificationType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
