package io.github.qifan777.server.reveal.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RevealRoomStoreTest {

    private RevealRoomStore store;

    @BeforeEach
    void setUp() {
        store = new RevealRoomStore();
    }

    @Test
    void joinAndLeave_manageMembers() {
        store.join("room-1", "host-1");
        store.join("room-1", "spec-1");

        RevealRoomStore.RoomState state = store.getState("room-1");
        assertThat(state.members()).containsExactlyInAnyOrder("host-1", "spec-1");

        store.leave("room-1", "spec-1");
        assertThat(store.getState("room-1").members()).containsExactly("host-1");

        store.leave("room-1", "host-1");
        assertThat(store.getState("room-1").members()).isEmpty();
        assertThat(store.getState("room-1").phase()).isEqualTo("idle");
    }

    @Test
    void updateProgress_persistsPhaseAndIndex() {
        store.join("room-2", "host-2");
        store.updateProgress("room-2", 2, 5, "playing", 1234L);

        RevealRoomStore.RoomState state = store.getState("room-2");
        assertThat(state.revealIndex()).isEqualTo(2);
        assertThat(state.total()).isEqualTo(5);
        assertThat(state.phase()).isEqualTo("playing");
        assertThat(state.ts()).isEqualTo(1234L);
    }

    @Test
    void addReaction_returnsRecentEntries() {
        store.addReaction("room-3", "host-3", "🔥", 1000L);
        store.addReaction("room-3", "spec-3", "👏", 1001L);

        assertThat(store.recentReactions("room-3"))
                .extracting(RevealRoomStore.ReactionEntry::emoji)
                .containsExactly("👏", "🔥");
    }

    @Test
    void emptyRoom_returnsIdleState() {
        RevealRoomStore.RoomState state = store.getState("missing-room");
        assertThat(state.phase()).isEqualTo("idle");
        assertThat(state.members()).isEmpty();
    }
}
