# UI Improvement Ideas for GiveCalc

## Already Implemented ✅
- Spinners during calculations
- Two-column input layout
- Success messages
- Better button styling
- Target donation in collapsible section

## Future Enhancements

### Performance
- **Caching** - Use `@st.cache_data` to cache calculation results
  - Cache `create_situation()` based on inputs
  - Cache PolicyEngine calculations
  - Will make UI more responsive

### User Experience
- **Pre-filled examples** - Add "Try example" buttons (e.g., "Family of 4, $100k income")
- **Input validation** - Show warnings for unusual inputs
- **Keyboard shortcuts** - Enter key to calculate
- **URL state** - Save inputs in URL for sharing scenarios
- **Download results** - Export calculations as PDF/CSV

### Visualization
- **Interactive charts** - Click chart to update donation amount
- **Comparison view** - Side-by-side comparison of different scenarios
- **Progress bar** - Show calculation progress (1001 simulations)
- **Animated transitions** - Smooth transitions between results

### Educational
- **Tooltips** - Explain tax terms (EITC, standard deduction, etc.)
- **Example scenarios** - "What others like you donate"
- **Tax brackets visual** - Show which bracket user is in
- **Effective tax rate** - Display prominently

### Mobile
- **Responsive design** - Better mobile layout
- **Touch-friendly inputs** - Larger tap targets
- **Simplified mobile view** - Hide advanced options by default

### Accessibility
- **Keyboard navigation** - Full keyboard support
- **Screen reader support** - ARIA labels
- **High contrast mode** - For vision impairment
- **Font size controls** - User-adjustable text size

### Advanced Features
- **Multi-year planning** - Project donations over multiple years
- **Scenario comparison** - Compare 2-3 donation amounts side by side
- **State comparison** - How would taxes differ in another state?
- **Investment income** - Add capital gains, dividends
- **Retirement contributions** - Include 401k, IRA
- **Save scenarios** - Login to save/load scenarios

### Polish
- **Loading skeletons** - Show chart placeholders while calculating
- **Error messages** - User-friendly error handling
- **Help documentation** - Inline help/FAQ
- **Guided tour** - First-time user walkthrough
- **Dark mode** - Optional dark theme

## Quick Wins (30 min each)
1. Add @st.cache_data to expensive functions
2. Add "Reset" button to clear inputs
3. Add footer with version number and last updated date
4. Add keyboard shortcut (Ctrl+Enter to calculate)
5. Add loading skeletons for charts
