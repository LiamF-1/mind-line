# Time Tracking Feature Documentation

## Overview

The Time Tracking feature provides comprehensive focus session logging, Pomodoro timer functionality, distraction-free streaks, and detailed analytics. It's designed to help users understand their productivity patterns and maintain focus.

## Features

### 🕐 Timer Widget (Global Header)

- **Dual Mode**: Stopwatch and Pomodoro timer modes
- **Live Display**: Shows current elapsed time or countdown
- **Quick Controls**: Start/pause/resume with single click
- **Assignment**: Assign sessions to tasks, calendar events, or custom labels
- **Distraction Toggle**: Mark sessions as distraction-free for streak tracking

### 📊 Time Log Page

- **Today Total**: Current day's focused minutes
- **7-Day Chart**: Interactive bar chart showing daily activity
- **Session List**: Chronological list with quick edit and delete
- **Pomodoro Summary**: Completed pomodoros and total minutes

### 🔥 Streak Tracking

- **Customizable Target**: Configure what distraction you're avoiding (default: Instagram)
- **Daily Tracking**: Streak increments for days with ≥1 distraction-free session
- **Personal Records**: Shows current and best streak with gold flame for new records
- **Motivation**: Visual feedback to encourage consistent focus habits

### 🍅 Pomodoro Timer

- **Configurable Cycles**: Work/break durations and long break frequency
- **Auto-Transitions**: Optional auto-start for breaks and work sessions
- **Phase Tracking**: Visual indicators for work/break phases and cycle progress
- **Work Logging**: Only work intervals create time entries (breaks are runtime-only)
- **Notifications**: Optional browser notifications and sounds

## Keyboard Shortcuts

| Shortcut             | Action                           |
| -------------------- | -------------------------------- |
| `⌘/Ctrl + Shift + T` | Start/stop stopwatch             |
| `⌘/Ctrl + Shift + L` | Open Time Log                    |
| `⌘/Ctrl + Shift + P` | Start/stop Pomodoro              |
| `⌘/Ctrl + Shift + B` | Skip break (when in break phase) |
| `⌘/Ctrl + Shift + ,` | Open Pomodoro settings           |

## Database Schema

### Core Models

#### TimeEntry

```typescript
{
  id: string
  userId: string
  start: DateTime
  end: DateTime
  duration: number // seconds
  label?: string
  distractionFree: boolean
  taskId?: string
  eventId?: string
  source: 'STOPWATCH' | 'POMODORO'
  pomodoroRunId?: string
  pomodoroCycle?: number
}
```

#### PomodoroRun

```typescript
{
  id: string
  userId: string
  startedAt: DateTime
  endedAt?: DateTime
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
  autoStartNextPhase: boolean
  autoStartNextWork: boolean
  completedWorkCount: number
}
```

#### PomodoroPreference

```typescript
{
  userId: string
  workMinutes: number // default: 25
  shortBreakMinutes: number // default: 5
  longBreakMinutes: number // default: 15
  longBreakEvery: number // default: 4
  autoStartNextPhase: boolean
  autoStartNextWork: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
  defaultLabel?: string
  distractionFreeDefault: boolean
}
```

#### DistractionPreference

```typescript
{
  userId: string
  targetName: string // default: "Instagram"
}
```

## API Endpoints (tRPC)

### Time Router (`time.*`)

#### Mutations

- `startTimer()` - Validate session start (client-side managed)
- `stopTimer(start, end, assignment)` - Save completed session
- `updateEntry(id, updates)` - Edit existing time entry
- `deleteEntry(id)` - Remove time entry
- `updateStreak(targetName)` - Change distraction target

#### Queries

- `listEntries(from?, to?, limit?)` - Get time entries with pagination
- `getStreak()` - Current and best streak with target name
- `getSummary(range)` - Daily breakdown and totals
- `getTodayTotal()` - Today's focused minutes
- `getPomodoroSummary(range)` - Pomodoro-specific statistics

### Pomodoro Router (`pomodoro.*`)

#### Mutations

- `startRun(assignment)` - Create new pomodoro run
- `completePhase(runId, phase, timing)` - Log completed work interval
- `cancelRun(runId, logPartial?)` - Cancel with optional partial work
- `endRun(runId)` - Mark run as completed
- `updatePreferences(settings)` - Save user preferences

#### Queries

- `getPreferences()` - User's pomodoro settings
- `getActiveState()` - Current running pomodoro (if any)
- `getSummary(range)` - Pomodoro completion statistics

## Client Architecture

### Timer Store (Zustand + localStorage)

The timer store manages both stopwatch and pomodoro state with automatic persistence:

```typescript
interface TimerStore {
  mode: 'stopwatch' | 'pomodoro'
  stopwatch: StopwatchState
  pomodoro: PomodoroState

  // Actions for both modes
  setMode(mode)
  startStopwatch(assignment?)
  pauseStopwatch()
  resumeStopwatch()
  stopStopwatch()

  startPomodoro(runId, preferences, assignment?)
  pausePomodoro()
  resumePomodoro()
  skipPomodoroPhase()
  cancelPomodoro()
  completePomodoroPhase()

  getCurrentTime() // current elapsed/remaining seconds
  reset()
}
```

### State Persistence

- **localStorage**: Timer state survives browser refresh
- **Server Reconciliation**: On app boot, client state syncs with server
- **Optimistic Updates**: UI updates immediately, syncs with server async

### Recovery Logic

- If localStorage claims active timer but server has none → prefer server, clear client
- If server has active run but client doesn't → restore to client store
- Timezone-aware calculations for "today" and streak logic

## Component Structure

```
components/timer/
├── timer-widget.tsx              # Main header widget
├── timer-assignment-modal.tsx    # Task/event/label assignment
├── pomodoro-settings-modal.tsx   # Pomodoro configuration
├── time-entry-edit-modal.tsx     # Edit existing entries
├── streak-panel.tsx              # Streak display and target config
└── keyboard-shortcuts-provider.tsx # Global shortcut handler
```

## Usage Examples

### Basic Stopwatch

1. Click timer widget in header
2. Timer starts automatically
3. Click again to pause
4. Click third time (when paused) to stop and save

### Pomodoro Session

1. Switch to Pomodoro mode via dropdown
2. Configure preferences (optional)
3. Click start - begins 25-minute work session
4. Timer auto-transitions to break (if enabled)
5. Work intervals are automatically saved as TimeEntry records

### Session Assignment

1. Use dropdown → "Set Label/Task/Event"
2. Choose custom label, existing task, or calendar event
3. Toggle distraction-free status
4. Assignment applies to current/next session

### Streak Tracking

1. Complete distraction-free sessions daily
2. View streak in Time Log page sidebar
3. Customize distraction target via settings
4. Gold flame appears on new personal records

## Testing

### Unit Tests

- Timer store state transitions
- Streak calculation logic
- Time formatting utilities

### Component Tests

- Timer widget interactions
- Modal form submissions
- Chart data rendering
- Keyboard shortcuts

### Integration Tests

- Complete Pomodoro flow
- Session saving and editing
- Streak updates after sessions

## Development Setup

1. **Install Dependencies**:

   ```bash
   pnpm install
   ```

2. **Run Database Migration**:

   ```bash
   pnpm --filter mindline-web exec prisma migrate dev
   ```

3. **Seed Demo Data**:

   ```bash
   pnpm --filter mindline-web exec prisma db seed
   ```

4. **Start Development Server**:
   ```bash
   pnpm dev
   ```

## Production Deployment

### Environment Variables

```env
# Required for time tracking
POSTGRES_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

### Database Setup

1. Run migrations: `prisma migrate deploy`
2. Generate client: `prisma generate`
3. Seed data (optional): `prisma db seed`

### Performance Considerations

- Time entries are indexed by user_id and start date
- Streak calculations use efficient SQL queries
- Chart data is aggregated server-side
- Client state is debounced to avoid excessive API calls

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Notifications**: Requires user permission for browser notifications
- **localStorage**: Required for timer persistence
- **Date Handling**: Uses date-fns for consistent timezone support

## Troubleshooting

### Timer Not Persisting

- Check browser localStorage permissions
- Verify no browser extensions blocking storage
- Clear localStorage and restart: `localStorage.removeItem('mindline-timer-storage')`

### Streak Not Updating

- Ensure sessions are marked as distraction-free
- Check timezone settings match user location
- Verify database queries are using correct date ranges

### Notifications Not Working

- Check browser notification permissions
- Enable notifications in Pomodoro settings
- Test with browser developer tools console

## Future Enhancements

### Planned Features

- Weekly/monthly streak views
- Focus session analytics and trends
- Team productivity dashboards
- Integration with external time tracking tools
- Mobile app with push notifications
- Offline support with sync

### API Extensions

- Export time data (CSV, JSON)
- Webhook integrations
- REST API for third-party tools
- GraphQL subscriptions for real-time updates

---

## Support

For issues or questions about the Time Tracking feature:

1. Check existing GitHub issues
2. Review test files for usage examples
3. Examine tRPC router implementations
4. Test with demo data using seed script
