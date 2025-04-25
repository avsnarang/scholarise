import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Users, 
  UserCheck,
  Clock,
  Award
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface TeacherStatsProps {
  totalTeachers: number;
  totalTeachersChange: number;
  activeTeachers: number;
  activeTeachersChange: number;
  averageExperience: number;
  experienceChange: number;
  certifiedTeachers: number;
  certifiedTeachersChange: number;
}

export function TeacherStatsCards({
  totalTeachers = 86,
  totalTeachersChange = 8.0,
  activeTeachers = 82,
  activeTeachersChange = 5.2,
  averageExperience = 7.5,
  experienceChange = 0.8,
  certifiedTeachers = 78,
  certifiedTeachersChange = 12.5
}: Partial<TeacherStatsProps>) {
  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Teachers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalTeachers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalTeachersChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {totalTeachersChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalTeachersChange >= 0 ? "+" : ""}{totalTeachersChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4 text-[#00501B]" /> 
            {totalTeachersChange >= 0 ? "Faculty growth on track" : "Faculty reduction"}
          </div>
          <div className="text-muted-foreground">
            Compared to previous academic year
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Teachers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeTeachers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeTeachersChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {activeTeachersChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeTeachersChange >= 0 ? "+" : ""}{activeTeachersChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <UserCheck className="size-4 text-[#00501B]" /> 
            {activeTeachersChange >= 0 ? "Improving retention" : "Declining retention"}
          </div>
          <div className="text-muted-foreground">
            {Math.round((activeTeachers / totalTeachers) * 100)}% of total faculty
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Experience</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {averageExperience} years
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={experienceChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {experienceChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {experienceChange >= 0 ? "+" : ""}{experienceChange} yrs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Clock className="size-4 text-[#00501B]" /> 
            {experienceChange >= 0 ? "Experienced faculty" : "Less experienced faculty"}
          </div>
          <div className="text-muted-foreground">
            Compared to previous academic year
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Certified Teachers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {certifiedTeachers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={certifiedTeachersChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {certifiedTeachersChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {certifiedTeachersChange >= 0 ? "+" : ""}{certifiedTeachersChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Award className="size-4 text-[#00501B]" /> 
            {certifiedTeachersChange >= 0 ? "More qualified faculty" : "Less qualified faculty"}
          </div>
          <div className="text-muted-foreground">
            {Math.round((certifiedTeachers / totalTeachers) * 100)}% of total faculty
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
