import * as React from "react"

export interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: 'single' | 'range'
  selected?: any
  onSelect?: (date: any) => void
  numberOfMonths?: number
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode = 'single', selected, onSelect, numberOfMonths = 1, ...props }, ref) => {
    // This is a simplified calendar component
    // In a real implementation, you'd use a library like react-day-picker
    
    const handleDateClick = (date: Date) => {
      if (mode === 'single') {
        onSelect?.(date)
      } else if (mode === 'range') {
        if (!selected?.from) {
          onSelect?.({ from: date, to: undefined })
        } else if (!selected?.to && date > selected.from) {
          onSelect?.({ from: selected.from, to: date })
        } else {
          onSelect?.({ from: date, to: undefined })
        }
      }
    }

    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const isSelected = mode === 'single' 
        ? selected && date.toDateString() === selected.toDateString()
        : selected?.from && date >= selected.from && (!selected.to || date <= selected.to)
      
      days.push(
        <button
          key={day}
          className={`p-2 text-sm rounded hover:bg-accent ${
            isSelected ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </button>
      )
    }

    return (
      <div ref={ref} className={`p-3 ${className || ''}`} {...props}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="p-2 text-xs font-medium text-center text-muted-foreground">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    )
  }
)
Calendar.displayName = "Calendar"

export { Calendar }