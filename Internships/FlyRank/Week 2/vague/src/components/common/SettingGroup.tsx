import './SettingGroup.css'

interface SettingGroupProps {
  title: string
  description?: string
  isDanger?: boolean
  children: React.ReactNode
}

const SettingGroup = ({
  title,
  description,
  isDanger = false,
  children
}: SettingGroupProps) => {
  return (
    <section className={`setting-group ${isDanger ? 'danger' : ''}`}>
      <div className="setting-group-header">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="setting-group-content">
        {children}
      </div>
    </section>
  )
}

export default SettingGroup
