export type Tone = 'todo' | 'active' | 'review' | 'done' | 'risk' | 'planned'

export interface CourseEntry {
  title: string
  label: string
  code: string
  year: string
  yearId: string
  semester: string
  semesterId: string
  hours: number
  status: string
  tone: Tone
  route: string
}

export interface SemesterGroup {
  id: string
  title: string
  hours: number
  courses: CourseEntry[]
}

export interface RelatedItem {
  label: string
  link?: string
  meta?: string
  tone?: Tone
}

export interface RelatedGroups {
  courses?: RelatedItem[]
  topics?: RelatedItem[]
  labs?: RelatedItem[]
}

export interface YearEntry {
  id: string
  name: string
  period: string
  direction: string
  status: string
  tone: Tone
  plannedHours: number
  passedHours: number
  learningHours: number
  courseCount: number
  passedCount: number
  route: string
  hasOverview: boolean
  semesters: SemesterGroup[]
  courses: CourseEntry[]
  plannedCourses: string[]
  extras: RelatedItem[]
}

export interface TopicEntry {
  title: string
  tag: string
  description: string
  route: string
  href: string
  order: number
  relatedCourses: string[]
  courses: RelatedItem[]
  labs: RelatedItem[]
  level: string
}

export interface LabEntry {
  title: string
  description: string
  route: string
  href: string
  order: number
  difficulty: string
  minutes: number
  relatedTopics: string[]
  topics: RelatedItem[]
}

export interface RecentEntry {
  title: string
  route: string
  href: string
  kind: string
  date: string
  mtime: number
}

export interface Totals {
  plannedHours: number
  passedHours: number
  learningHours: number
  courseCount: number
  passedCount: number
  learningCount: number
  planningCourseCount: number
  topicCount: number
  labCount: number
}

export interface CurriculumData {
  years: YearEntry[]
  totals: Totals
  topics: TopicEntry[]
  labs: LabEntry[]
  recent: RecentEntry[]
  related: Record<string, RelatedGroups>
}
