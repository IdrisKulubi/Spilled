# TeaKE - "Is He Seeing Others?"

A React Native app built with Expo that helps Kenyan women discreetly check if the guy they're dating is seeing other people.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g @expo/cli`
- Supabase account

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Get your project URL and anon key from Settings > API
4. Enable Phone Auth in Authentication > Settings
5. Configure SMS provider (Twilio recommended for Kenya)

### 3. Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the App

```bash
# Start Expo development server
npm start

# Run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## 📱 Features

### Core Features
- **🔍 Search for guys** by name, phone, or social handles
- **📝 Anonymous posting** about dating experiences
- **💬 Private messaging** with end-to-end encryption
- **🏷️ Tag system**: Red flags 🚩, Good vibes ✅, Unsure ❓
- **🔒 Phone verification** with Kenyan number support

### Security & Privacy
- End-to-end encrypted messages
- Messages auto-delete after 7 days
- Anonymous posting by default
- Row-level security in database
- Optional phone verification

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: NativeWind (Tailwind for React Native)
- **Language**: TypeScript

### Folder Structure
```
src/
├── screens/           # Main app screens
│   ├── SearchScreen.tsx
│   ├── GuyProfileScreen.tsx
│   ├── AddPostScreen.tsx
│   └── ChatScreen.tsx
├── components/        # Reusable UI components
│   ├── ui/           # Base components (buttons, cards, etc.)
│   ├── cards/        # Post and comment cards
│   └── messaging/    # Chat components
├── actions/          # Database operations
│   ├── addPost.ts
│   ├── fetchGuyProfile.ts
│   └── sendMessage.ts
├── utils/           # Helper functions
│   └── auth.ts
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── config/          # Configuration files
│   └── supabase.ts
└── types/           # TypeScript definitions
    └── database.ts
```

## 🎨 Design System

### Colors
- **Primary**: `#D96BA0` (Muted Rose)
- **Background**: `#FFF8F9` (Light Blush White)
- **Accent**: `#FDECEF` (Soft Blush)
- **Red Flag**: `#F25F5C` (Warm Coral)
- **Success**: `#76C893` (Soft Green)
- **Unsure**: `#FFD23F` (Gentle Yellow)

### Components
- **TeaKEButton**: Primary, secondary, and danger variants
- **StatusTag**: Visual tags for story categorization
- **TeaKECard**: Consistent card styling with optional press handling

## 🗄️ Database Schema

### Tables
- **users**: User profiles and verification status
- **guys**: Guy profiles created by users
- **stories**: Posts/experiences about guys
- **comments**: Comments on stories
- **messages**: Encrypted messages between users

### Key Features
- Row-level security (RLS) for data protection
- Auto-expiring messages (7 days)
- Full-text search for guy profiles
- Optimized indexes for performance

## 📋 Development

### Adding New Features

1. **Database changes**: Update `database/schema.sql`
2. **Types**: Update `src/types/database.ts`
3. **Actions**: Add database operations in `src/actions/`
4. **Components**: Create reusable UI in `src/components/`
5. **Screens**: Add new screens in `src/screens/`

### Authentication Flow

```typescript
import { useAuth } from '../contexts/AuthContext';

const { user, signInWithOTP, verifyOTP } = useAuth();

// Send OTP
await signInWithOTP('+254712345678');

// Verify OTP
await verifyOTP('+254712345678', '123456');
```

### Database Operations

```typescript
import { addPost, fetchGuyProfile } from '../actions';

// Create a post
const result = await addPost({
  guyName: 'John Doe',
  storyText: 'He was really sweet...',
  tags: ['good_vibes'],
  anonymous: true
});

// Search for a guy
const profile = await fetchGuyProfile({
  name: 'John',
  phone: '0712345678'
});
```

## 🚦 Production Deployment

### 1. Build Configuration
```bash
# Build for production
expo build:android
expo build:ios
```

### 2. Environment Variables
Ensure production environment variables are set:
- Supabase production URLs
- SMS provider configuration
- Any analytics/monitoring keys

### 3. App Store Submission
- Follow [Expo's app store guidelines](https://docs.expo.dev/distribution/app-stores/)
- Ensure content policy compliance
- Set up proper app metadata and screenshots

## 🛡️ Legal & Safety

### Content Moderation
- Community reporting system
- Admin moderation panel
- Clear community guidelines
- Right to response mechanism

### Privacy Protection
- Anonymous posting by default
- Encrypted communications
- No permanent message storage
- GDPR/privacy law compliance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This app is designed to promote safety and transparency in dating. Users are expected to:
- Share truthful information
- Respect others' privacy
- Follow community guidelines
- Use the app responsibly

False or defamatory content is prohibited and may result in account suspension.