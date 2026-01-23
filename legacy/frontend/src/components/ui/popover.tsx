import * as React from "react"

const PopoverContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {}
})

export interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ open = false, onOpenChange = () => {}, children, ...props }, ref) => {
    return (
      <PopoverContext.Provider value={{ open, onOpenChange }}>
        <div ref={ref} className="relative" {...props}>
          {children}
        </div>
      </PopoverContext.Provider>
    )
  }
)
Popover.displayName = "Popover"

const PopoverTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }>(
  ({ className, children, asChild, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(PopoverContext)
    
    const handleClick = () => {
      onOpenChange(!open)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        onClick: handleClick,
        ref
      })
    }

    return (
      <div
        ref={ref}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }>(
  ({ className, align = 'center', ...props }, ref) => {
    const { open } = React.useContext(PopoverContext)
    
    if (!open) return null

    const alignmentClasses = {
      start: 'left-0',
      center: 'left-1/2 transform -translate-x-1/2',
      end: 'right-0'
    }

    return (
      <div
        ref={ref}
        className={`absolute top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${alignmentClasses[align]} ${className || ''}`}
        {...props}
      />
    )
  }
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }