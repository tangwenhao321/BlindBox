package io.github.qifan777.server.reveal.room;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RevealRoomRedisSubscriber implements MessageListener {

    private final RevealRoomHandler revealRoomHandler;
    private final RevealRoomRedisFanout revealRoomRedisFanout;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String roomId = RevealRoomRedisFanout.roomIdFromChannel(channel);
        if (roomId == null) {
            return;
        }
        String raw = new String(message.getBody());
        RevealRoomRedisFanout.Envelope envelope = revealRoomRedisFanout.parseEnvelope(raw);
        if (envelope == null) {
            return;
        }
        if (revealRoomRedisFanout.nodeId().equals(envelope.origin())) {
            return;
        }
        try {
            revealRoomHandler.deliverLocal(roomId, envelope.body(), null);
        } catch (Exception ex) {
            log.warn("reveal room redis fanout failed roomId={}: {}", roomId, ex.getMessage());
        }
    }
}
