# TeaKE UI/UX Design Guide

## 🎨 Design Philosophy

TeaKE's interface is designed around **safety, trust, and ease of use** for women sharing sensitive dating experiences. Every design decision prioritizes user comfort and psychological safety.

## 🧠 Psychological Design Principles

### 1. **Visual Hierarchy & Information Processing**
- **Primary focus**: Story content and reactions (red flags/good vibes)
- **Secondary focus**: User actions (comments, sharing)
- **Tertiary focus**: Profile details and metadata

### 2. **Color Psychology**
- **Muted Rose (#D96BA0)**: Feminine, approachable, trustworthy
- **Light Blush (#FFF8F9)**: Calming, safe space feeling
- **Warm Coral (#F25F5C)**: Alert without being aggressive
- **Soft Green (#76C893)**: Positive reinforcement, safety

### 3. **Cognitive Load Reduction**
- **Chunked information**: Stories, reactions, and actions are visually separated
- **Progressive disclosure**: "Show more" for long content
- **Familiar patterns**: Card-based layout similar to social media

## 📱 Component Design Rationale

### GuyCard Component

#### **Visual Structure**
```
┌─────────────────────────────────┐
│ Name • Age        [View Button] │
│ Location                        │
├─────────────────────────────────┤
│                                 │
│        Profile Image            │
│        (or placeholder)         │
│                                 │
├─────────────────────────────────┤
│ 🚩 17    ✅ 2                   │
├─────────────────────────────────┤
│ Story preview text...           │
│ Show more                       │
├─────────────────────────────────┤
│ ↗ Share              💬 32      │
│                        2 days ago│
└─────────────────────────────────┘
```

#### **Psychological Benefits**

1. **Trust Building**
   - Clear reaction counts (red flags vs good vibes)
   - Time stamps for recency
   - Story previews for transparency

2. **Reduced Anxiety**
   - Soft rounded corners (16px) feel approachable
   - Gentle shadows create depth without harshness
   - Muted colors reduce visual stress

3. **Quick Decision Making**
   - Reaction tags at eye level after image
   - Clear visual separation between sections
   - Action buttons grouped logically

4. **Social Proof**
   - Comment counts visible
   - Multiple reaction types shown
   - Community engagement indicators

## 🎯 User Experience Patterns

### **Information Scent**
Users can quickly assess:
- Guy's basic info (name, age, location)
- Community sentiment (red flags vs good vibes)
- Recent activity level (comments, time)
- Story relevance (preview text)

### **Progressive Engagement**
1. **Browse**: Quick visual scan of cards
2. **Assess**: Read reaction counts and story preview
3. **Engage**: Tap to read full story and comments
4. **Act**: Comment, react, or message privately

### **Safety-First Design**
- No prominent user avatars (maintains anonymity)
- Soft, non-threatening visual language
- Clear escape routes (back buttons, close options)
- Gentle feedback for all interactions

## 📐 Layout Specifications

### **Spacing System**
- **xs**: 4px - Tight spacing within elements
- **sm**: 8px - Related elements
- **md**: 16px - Standard component padding
- **lg**: 24px - Section separation
- **xl**: 32px - Major layout divisions
- **xxl**: 48px - Screen-level spacing

### **Typography Hierarchy**
- **Heading 1**: 28px, Bold - Screen titles
- **Heading 2**: 22px, Semibold - Section headers
- **Body**: 16px, Regular - Main content
- **Caption**: 14px, Regular - Metadata, timestamps

### **Interactive Elements**
- **Touch targets**: Minimum 44px for accessibility
- **Button radius**: 12px for primary, 20px for pills
- **Active states**: 98% scale with gentle opacity
- **Feedback**: Immediate visual response to taps

## 🔄 Animation Guidelines

### **Micro-interactions**
- **Card press**: Scale to 98% (feels responsive, not jarring)
- **Button press**: Slight opacity change (0.8)
- **Loading states**: Gentle pulse, not spinning

### **Transitions**
- **Screen changes**: Slide transitions (300ms)
- **Modal appearance**: Fade in with slight scale (250ms)
- **Content updates**: Smooth fade transitions (200ms)

## 📊 Accessibility Considerations

### **Visual Accessibility**
- **Contrast ratios**: All text meets WCAG AA standards
- **Color independence**: Information not conveyed by color alone
- **Text sizing**: Respects system font size preferences

### **Motor Accessibility**
- **Touch targets**: 44px minimum size
- **Spacing**: Adequate space between interactive elements
- **Gesture alternatives**: All swipe actions have button alternatives

### **Cognitive Accessibility**
- **Clear labels**: All buttons and actions clearly labeled
- **Consistent patterns**: Same interactions work the same way
- **Error prevention**: Confirmation for destructive actions

## 🎨 Component Usage Examples

### **When to use GuyCard**
- ✅ Explore/search results
- ✅ Trending lists
- ✅ Related profiles
- ❌ Detailed profile view (use full screen layout)
- ❌ Message threads (use message bubbles)

### **Customization Options**
```typescript
<GuyCard
  name="Jake"
  location="Nairobi"
  age={28}
  recentStory="Story preview..."
  redFlagCount={17}
  goodVibesCount={2}
  commentCount={32}
  timeAgo="2 days ago"
  onPress={() => navigateToProfile()}
  onShare={() => shareProfile()}
/>
```

## 🔮 Future Enhancements

### **Planned Improvements**
1. **Adaptive cards**: Different layouts for different story types
2. **Mood indicators**: Visual cues for story emotional tone
3. **Trust scores**: Algorithmic safety ratings
4. **Personalization**: Cards adapt to user preferences

### **A/B Testing Opportunities**
- Card image sizes and aspect ratios
- Reaction display formats (numbers vs bars)
- Story preview lengths
- Action button placements

---

This design system prioritizes **user safety and comfort** while maintaining **visual appeal and usability**. Every element is designed to help women make informed decisions about their dating lives in a supportive, non-judgmental environment.