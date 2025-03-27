package be.stage.ticharmony.model;

public enum UserRole {
    ADMIN("admin"),
    MEMBER("member"),
    CLIENT("client");

    private String role;

    UserRole(String role) {
        this.role = role;
    }

    public String getValue() {
        return role;
    }
}
