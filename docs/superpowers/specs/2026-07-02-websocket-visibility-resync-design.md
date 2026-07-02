# WebSocket Visibility Resync

## Problem

Players report they "can't tell if it's my turn" after the app has been backgrounded (e.g. phone locked, tab switched away) and then reopened. Mobile browsers suspend timers and network activity for background tabs, including the game's WebSocket connection and its heartbeat interval. This suspension does not reliably fire the socket's `onclose` event, so `useWebSocket`'s React-tracked `connectionStatus` can continue reporting `'connected'` even though the underlying socket is a "zombie" that will never receive another message.

A previous commit (`e813b5597`, "Add dual-completion gameplay, game cleanup admin, and new words") removed a `visibilitychange`-triggered refetch that used to run when the tab regained visibility. Its removal was incidental to that commit's actual focus (dual-completion gameplay) and left no replacement mechanism for detecting or recovering from a zombie connection. As a result, after backgrounding, the turn indicator can show stale data indefinitely with no user-facing signal that anything is wrong.

## Goals

- When a player returns to a backgrounded/hidden tab, the turn indicator (and all game state) must reflect the server's current state within one round trip, every time — not depend on the WebSocket's self-reported (and possibly wrong) status.
- If the WebSocket is not actually open, re-establish it so live updates resume without requiring a manual page reload.
- No new UI chrome (no "reconnecting" banner) — the fix must be invisible to the player; the only user-visible effect is that the screen is simply always correct.

## Non-goals

- General WebSocket connection-status UI (e.g. a persistent connected/disconnected indicator) — explicitly out of scope per user preference in this round of work.
- Changing the heartbeat interval or building a full liveness-detection protocol (e.g. ping/pong timeout tracking) — the existing 5-minute heartbeat is untouched.
- Handling non-visibility-related silent disconnects (e.g. a socket that dies while the tab is foregrounded for some other reason). Out of scope for this change; would require heartbeat-based liveness detection (a larger, separate change).

## Design

### `frontend/src/api/websocket.ts` (`WebSocketClient`)

Add two public methods:

- `isHealthy(): boolean` — returns `this.ws?.readyState === WebSocket.OPEN`. This reads the actual browser `WebSocket` object's state directly, rather than relying on the class's own `status` field (which is only updated by event handlers that may not have fired during background suspension).
- `reconnectNow(): void` — tears down any existing socket (mirrors the cleanup in `disconnect()`, but does **not** set `intentionallyClosed = true` and does **not** touch `reconnectAttempts`) and calls `doConnect()` immediately. This is a deliberate, user-triggered resync distinct from the automatic backoff-based reconnection in `attemptReconnect()` — it should not be throttled by, or count against, the exponential backoff attempt budget.

### `frontend/src/hooks/useWebSocket.ts`

Re-add a `visibilitychange` effect:

```
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchGameState();
      if (!wsClientRef.current?.isHealthy()) {
        wsClientRef.current?.reconnectNow();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [fetchGameState]);
```

Key difference from the removed version: the old handler only refetched when `connectionStatus !== 'connected'` — i.e., it trusted the React-tracked status. The new handler refetches unconditionally on every visibility-regain, because the React-tracked status is exactly what can't be trusted after background suspension (that's the root cause). The healthiness check (`isHealthy()`) reads the real socket state to decide whether a reconnect is also needed, independent of the refetch.

## Data Flow

1. Tab is hidden (backgrounded) → browser may suspend the page's timers and network activity, including the WebSocket and its heartbeat.
2. Tab becomes visible again → `visibilitychange` fires with `document.visibilityState === 'visible'`.
3. `fetchGameState()` runs immediately — a REST call to `GET` game state, which returns the authoritative `myTurn`/game state regardless of WebSocket health. This corrects the visible UI within one round trip.
4. `wsClientRef.current?.isHealthy()` checks the actual socket `readyState`. If it's not `OPEN` (e.g. the underlying connection died silently while backgrounded), `reconnectNow()` tears down the stale socket object and opens a fresh one, so future live `GAME_UPDATE` pushes resume working.
5. If the socket was actually still healthy (e.g. a quick tab-switch that didn't trigger OS-level suspension), only step 3 runs — no unnecessary reconnect.

## Error Handling

- `fetchGameState()` is unchanged — it already has its own try/catch with a cached-state fallback (see `frontend/src/hooks/useWebSocket.ts`, existing code).
- `reconnectNow()` reuses `doConnect()`'s existing try/catch (existing code) — connection failures surface through the same `error`/`failed` event path as any other connection attempt.
- No new error states are introduced by this change.

## Testing

**`frontend/src/api/websocket.ts` (`WebSocketClient`):**
- `isHealthy()` returns `true` when the mocked `WebSocket.readyState` is `OPEN`, `false` for `CONNECTING`, `CLOSING`, `CLOSED`, and `false` when no socket exists yet.
- `reconnectNow()` closes any existing socket and calls `doConnect()`, without setting `intentionallyClosed` and without incrementing `reconnectAttempts`.

**`frontend/src/hooks/useWebSocket.ts`:**
- Simulating `visibilitychange` to `'visible'` while the mocked WebSocket client reports healthy → `fetchGameState` (via the underlying API call) is invoked; `reconnectNow` is not.
- Simulating `visibilitychange` to `'visible'` while the mocked WebSocket client reports unhealthy → both the refetch and `reconnectNow` are invoked.
- Simulating `visibilitychange` to `'hidden'` → neither is invoked.
