package be.stage.ticharmony.service;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    NotificationRepository repo;

    @InjectMocks
    NotificationService service;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private User makeUser(long id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    private Problem makeProblem(long id) {
        Problem p = new Problem();
        p.setId(id);
        return p;
    }

    // ─── notify() ─────────────────────────────────────────────────────────────

    @Test
    void notify_savesNotificationWithCorrectFields() {
        User user = makeUser(1L);
        Problem problem = makeProblem(10L);

        service.notify(user, problem, NotificationType.NEW_PROBLEM);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(repo).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getProblem()).isEqualTo(problem);
        assertThat(saved.getType()).isEqualTo(NotificationType.NEW_PROBLEM);
    }

    // ─── countUnreadForUser() ─────────────────────────────────────────────────

    @Test
    void countUnreadForUser_delegatesToRepository() {
        User user = makeUser(1L);
        when(repo.countUnreadByUser(user)).thenReturn(7L);

        assertThat(service.countUnreadForUser(user)).isEqualTo(7L);
    }

    @Test
    void countUnreadForUser_returnsZeroWhenNone() {
        User user = makeUser(1L);
        when(repo.countUnreadByUser(user)).thenReturn(0L);

        assertThat(service.countUnreadForUser(user)).isEqualTo(0L);
    }

    // ─── hasUnreadUrgentForUser() ─────────────────────────────────────────────

    @Test
    void hasUnreadUrgentForUser_returnsTrueWhenUrgentExists() {
        User user = makeUser(1L);
        when(repo.existsByUserAndViewedFalseAndType(user, NotificationType.PRIORITY_URGENT))
                .thenReturn(true);

        assertThat(service.hasUnreadUrgentForUser(user)).isTrue();
    }

    @Test
    void hasUnreadUrgentForUser_returnsFalseWhenNoUrgent() {
        User user = makeUser(1L);
        when(repo.existsByUserAndViewedFalseAndType(user, NotificationType.PRIORITY_URGENT))
                .thenReturn(false);

        assertThat(service.hasUnreadUrgentForUser(user)).isFalse();
    }

    // ─── markAllRead() ────────────────────────────────────────────────────────

    @Test
    void markAllRead_callsBatchUpdateOnRepo() {
        User user = makeUser(1L);
        service.markAllRead(user);

        verify(repo).markAllReadByUser(user);
    }

    // ─── deleteNotificationsForProblem() ─────────────────────────────────────

    @Test
    void deleteNotificationsForProblem_callsCorrectRepoMethod() {
        Problem problem = makeProblem(10L);

        service.deleteNotificationsForProblem(problem, NotificationType.NEW_PROBLEM);

        verify(repo).deleteByProblemAndType(problem, NotificationType.NEW_PROBLEM);
    }

    // ─── notifyOnce() ─────────────────────────────────────────────────────────

    @Test
    void notifyOnce_createsNotifWhenNoneExists() {
        User user = makeUser(1L);
        Problem problem = makeProblem(10L);
        when(repo.findByUserAndProblemAndTypeAndViewedFalse(user, problem, NotificationType.NEW_PROBLEM))
                .thenReturn(List.of());

        service.notifyOnce(user, problem, NotificationType.NEW_PROBLEM);

        verify(repo).save(any(Notification.class));
    }

    @Test
    void notifyOnce_doesNotDuplicateWhenAlreadyExists() {
        User user = makeUser(1L);
        Problem problem = makeProblem(10L);
        Notification existing = new Notification();
        when(repo.findByUserAndProblemAndTypeAndViewedFalse(user, problem, NotificationType.NEW_PROBLEM))
                .thenReturn(List.of(existing));

        service.notifyOnce(user, problem, NotificationType.NEW_PROBLEM);

        verify(repo, never()).save(any(Notification.class));
    }

    // ─── markAllReadForProblem() ──────────────────────────────────────────────

    @Test
    void markAllReadForProblem_callsBatchUpdateForProblem() {
        User user = makeUser(1L);
        Problem problem = makeProblem(10L);

        service.markAllReadForProblem(user, problem);

        verify(repo).markAllReadByUserAndProblem(user, problem);
    }
}