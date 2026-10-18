# React AI Dashboard Settings Page

A comprehensive, modern React settings page component for an AI dashboard application. Built with TypeScript, Vite, and featuring a responsive design with multiple configuration sections.

## Features

### Settings Sections

1. **Account Settings**
   - Profile management (name, email, organization, bio)
   - Profile picture upload
   - Theme preferences (Light/Dark/Auto)
   - Language and timezone selection
   - Account deletion and data download

2. **Notifications**
   - Email and push notification preferences
   - Alert types customization (AI Updates, Performance, Security)
   - Notification frequency control
   - Quiet hours scheduling
   - Product update subscription

3. **Security**
   - Two-factor authentication (2FA)
   - Biometric login
   - Session management
   - IP whitelist
   - Login alerts
   - Recent activity log

4. **AI Settings**
   - Model configuration (version, batch size, learning rate)
   - Auto-training and optimization
   - Inference settings
   - Experimental features
   - Performance metrics display

5. **Data & Privacy**
   - Data collection preferences
   - Third-party data sharing controls
   - Data retention policies
   - Data export options (JSON, CSV, Reports)
   - GDPR compliance information
   - Privacy links and agreements

6. **Performance**
   - Optimization features (caching, compression)
   - Resource management
   - Cache settings
   - Network optimization
   - System performance metrics
   - Advanced performance tuning

## Project Structure

```
FlyRank/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── SettingGroup.tsx
│   │   │   ├── SettingGroup.css
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormInput.css
│   │   │   ├── ToggleSwitch.tsx
│   │   │   └── ToggleSwitch.css
│   │   └── sections/
│   │       ├── AccountSettings.tsx
│   │       ├── AccountSettings.css
│   │       ├── NotificationSettings.tsx
│   │       ├── NotificationSettings.css
│   │       ├── SecuritySettings.tsx
│   │       ├── SecuritySettings.css
│   │       ├── AISettings.tsx
│   │       ├── AISettings.css
│   │       ├── DataSettings.tsx
│   │       ├── DataSettings.css
│   │       ├── PerformanceSettings.tsx
│   │       └── PerformanceSettings.css
│   ├── pages/
│   │   ├── SettingsPage.tsx
│   │   └── SettingsPage.css
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── .env.example
```

## Installation

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```
   Update the values in `.env.local` as needed.

3. **Start development server:**
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## Key Components

### SettingGroup
Wrapper component for organizing settings sections with title and description.

```tsx
<SettingGroup 
  title="Account Settings" 
  description="Manage your profile"
>
  {/* Content */}
</SettingGroup>
```

### FormInput
Reusable form input component supporting text, email, and textarea types.

```tsx
<FormInput
  label="Full Name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter your name"
/>
```

### ToggleSwitch
Custom toggle switch component for boolean settings.

```tsx
<ToggleSwitch
  checked={enabled}
  onChange={(checked) => setEnabled(checked)}
/>
```

## Styling

The application uses CSS custom properties (CSS variables) for theming:

- **Colors**: Primary, secondary, success, warning, danger
- **Grays**: 50-900 scale
- **Layout**: Flexbox and Grid
- **Responsive**: Mobile-first design with breakpoints

### Dark Mode
Dark mode is supported through CSS variables that automatically update when the `.app.dark-mode` class is applied.

### Customization
To customize colors, edit the CSS variables in `src/index.css`:

```css
:root {
  --primary: #6366f1;
  --secondary: #ec4899;
  /* ... more variables */
}
```

## Features Highlights

✨ **Modern UI/UX**
- Clean, professional design
- Smooth animations and transitions
- Responsive layout for all devices
- Accessibility-friendly components

🎨 **Theming**
- Light/Dark mode support
- CSS variables for easy customization
- Consistent color palette

⚙️ **Comprehensive Settings**
- 6 major settings sections
- 30+ individual configuration options
- Real-time change detection
- Save/Cancel functionality

📱 **Responsive Design**
- Mobile-first approach
- Tablet and desktop optimized
- Flexible grid layouts
- Touch-friendly controls

🔒 **Security Features**
- 2FA configuration
- Session management
- Security activity logs
- IP whitelist management

## Performance Optimizations

- CSS variables for instant theme switching
- Lazy loading of settings sections
- Efficient re-renders with React hooks
- Optimized CSS with no unused styles
- Minimal bundle size

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Structure

Each settings section follows the same pattern:
1. Component file with business logic
2. Associated CSS file
3. Reusable common components
4. Props interface for type safety

### Adding New Settings

To add a new settings section:

1. Create a new component in `src/components/sections/`
2. Create corresponding CSS file
3. Add to sections array in `SettingsPage.tsx`
4. Implement the component following existing patterns

## Future Enhancements

- Backend API integration
- Settings persistence
- User preferences sync
- Multi-user settings
- Settings import/export
- Settings history/rollback
- Advanced permission management
- Settings presets/templates

## License

See LICENSE file for details.

## Support

For issues or questions, please create an issue in the repository.
