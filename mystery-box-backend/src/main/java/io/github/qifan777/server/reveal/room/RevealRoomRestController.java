package io.github.qifan777.server.reveal.room;

import cn.dev33.satoken.annotation.SaIgnore;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("front/reveal/room")
@RequiredArgsConstructor
public class RevealRoomRestController {

    private final RevealRoomStore roomStore;

    @SaIgnore
    @GetMapping("{roomId}/state")
    public RoomStateView getRoomState(@PathVariable String roomId) {
        RevealRoomStore.RoomState state = roomStore.getState(roomId);
        return new RoomStateView(
                state.roomId(),
                state.revealIndex(),
                state.total(),
                state.phase(),
                state.ts(),
                state.members()
        );
    }

    @SaIgnore
    @GetMapping("{roomId}/reactions")
    public List<ReactionView> getRoomReactions(@PathVariable String roomId) {
        return roomStore.recentReactions(roomId).stream()
                .map(entry -> new ReactionView(entry.memberId(), entry.emoji(), entry.ts()))
                .toList();
    }

    public record RoomStateView(
            String roomId,
            int revealIndex,
            int total,
            String phase,
            long ts,
            Set<String> members
    ) {
    }

    public record ReactionView(String memberId, String emoji, long ts) {
    }
}
