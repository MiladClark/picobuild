import { useTranslation } from 'react-i18next'
import { Moon, Sun, Check } from 'lucide-react'
import { PageHeader, Card, Section } from '@renderer/components/ui'
import { useThemeStore } from '@renderer/stores/theme-store'
import { cn } from '@renderer/lib/utils'

function ThemeTile({
  active,
  label,
  icon,
  preview,
  onClick
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  preview: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring group relative flex-1 overflow-hidden rounded-[var(--radius-md)] text-left transition-all duration-150',
        active
          ? 'shadow-[0_0_0_2px_var(--accent)]'
          : 'shadow-[0_0_0_1px_var(--border)] hover:shadow-[0_0_0_1px_var(--border-strong)]'
      )}
    >
      {preview}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
          {icon}
          {label}
        </span>
        {active && <Check size={13} className="text-[var(--accent)]" />}
      </div>
    </button>
  )
}

export function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <PageHeader title={t('settings.title')} />

      <div className="page-content ui-stack mx-auto w-full max-w-2xl flex-1">
        <Card>
          <Section title={t('settings.theme')}>
            <div className="flex gap-3">
              <ThemeTile
                active={theme === 'light'}
                label={t('settings.light')}
                icon={<Sun size={13} />}
                onClick={() => setTheme('light')}
                preview={
                  <div className="flex h-20 items-stretch gap-1.5 bg-[#ededf0] p-2.5">
                    <div className="w-1/4 rounded-[4px] bg-white shadow-[0_0_0_1px_#dcdce3]" />
                    <div className="flex-1 rounded-[4px] bg-[#dcdce2]" />
                    <div className="w-1/3 rounded-[4px] bg-white shadow-[0_0_0_1px_#dcdce3]" />
                  </div>
                }
              />
              <ThemeTile
                active={theme === 'dark'}
                label={t('settings.dark')}
                icon={<Moon size={13} />}
                onClick={() => setTheme('dark')}
                preview={
                  <div className="flex h-20 items-stretch gap-1.5 bg-[#0a0a0c] p-2.5">
                    <div className="w-1/4 rounded-[4px] bg-[#141419] shadow-[0_0_0_1px_#232329]" />
                    <div className="flex-1 rounded-[4px] bg-[#070709]" />
                    <div className="w-1/3 rounded-[4px] bg-[#141419] shadow-[0_0_0_1px_#232329]" />
                  </div>
                }
              />
            </div>
          </Section>
        </Card>

        <Card>
          <Section title={t('settings.language')}>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('settings.english')}
            </p>
          </Section>
        </Card>
      </div>
    </div>
  )
}
