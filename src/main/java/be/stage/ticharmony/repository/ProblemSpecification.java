package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ProblemSpecification {

    /** MEMBER : ses tickets + non assignés */
    public static Specification<Problem> forMember(User user) {
        return (root, query, cb) -> cb.or(
                cb.isNull(root.get("technician")),
                cb.equal(root.get("technician"), user)
        );
    }

    public static Specification<Problem> notClosed() {
        return (root, query, cb) -> cb.notEqual(root.get("status"), Status.CLOSED);
    }

    public static Specification<Problem> notResolved() {
        return (root, query, cb) -> cb.notEqual(root.get("status"), Status.RESOLVED);
    }

    public static Specification<Problem> withStatus(Status status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Problem> withPriority(Priority priority) {
        return (root, query, cb) -> cb.equal(root.get("priority"), priority);
    }

    public static Specification<Problem> unassigned() {
        return (root, query, cb) -> cb.isNull(root.get("technician"));
    }

    public static Specification<Problem> byTechnician(Long technicianId) {
        return (root, query, cb) -> cb.equal(root.get("technician").get("id"), technicianId);
    }

    public static Specification<Problem> inYear(int year) {
        LocalDateTime start = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime end   = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        return (root, query, cb) -> cb.between(root.get("createdAt"), start, end);
    }

    public static Specification<Problem> inMonth(int year, int month) {
        LocalDateTime start = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime end   = start.plusMonths(1).minusNanos(1);
        return (root, query, cb) -> cb.between(root.get("createdAt"), start, end);
    }

    public static Specification<Problem> matchesSearch(String search) {
        return (root, query, cb) -> {
            String lc = "%" + search.toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("title")), lc));
            predicates.add(cb.like(cb.lower(root.get("category")), lc));
            predicates.add(cb.like(cb.lower(root.get("ticketUserInfo").get("firstName")), lc));
            predicates.add(cb.like(cb.lower(root.get("ticketUserInfo").get("lastName")), lc));
            predicates.add(cb.like(cb.lower(root.get("ticketUserInfo").get("email")), lc));
            predicates.add(cb.like(cb.lower(root.get("user").get("nomEntreprise")), lc));
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Problem> forProfile(UserProfile profile) {
        return (root, query, cb) -> cb.equal(root.get("userProfile"), profile);
    }

    public static Specification<Problem> forUser(User user) {
        return (root, query, cb) -> cb.equal(root.get("user"), user);
    }
}
