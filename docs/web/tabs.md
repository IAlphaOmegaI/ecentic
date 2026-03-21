# Tabs

A tabbed interface for organizing content into separate views.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Tabs,
  TabsList,
  Tab,
  TabsIndicator,
  TabsPanel,
} from '@zenncore/web';
```

## Components

### Tabs

Root container.

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2</Tab>
  </TabsList>
  <TabsPanel value="tab1">Content 1</TabsPanel>
  <TabsPanel value="tab2">Content 2</TabsPanel>
</Tabs>
```

### TabsList

Container for tab buttons (pill-shaped background).

### Tab

Individual tab button.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Tab identifier |
| `disabled` | `boolean` | Disable tab |

### TabsIndicator

Animated indicator showing active tab.

### TabsPanel

Content panel for a tab.

---

## Examples

### Basic Tabs

```tsx
<Tabs defaultValue="general">
  <TabsList>
    <Tab value="general">General</Tab>
    <Tab value="advanced">Advanced</Tab>
    <Tab value="security">Security</Tab>
  </TabsList>
  <TabsPanel value="general">General settings...</TabsPanel>
  <TabsPanel value="advanced">Advanced settings...</TabsPanel>
  <TabsPanel value="security">Security settings...</TabsPanel>
</Tabs>
```

### Controlled Tabs

```tsx
const [activeTab, setActiveTab] = useState('home');

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <Tab value="home">Home</Tab>
    <Tab value="about">About</Tab>
  </TabsList>
  {/* panels */}
</Tabs>
```

---

## Notes

- Built on `@base-ui/react/tabs`
- Animated indicator follows active tab
- Keyboard navigation (arrow keys)
- `TabsList` has pill-shaped background
