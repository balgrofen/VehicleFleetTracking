"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "JárműŐr",
      logo: GalleryVerticalEnd,
      plan: "Vállalat",
    },
  ],
  navMain: [
    {
      title: "Autó követő",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
         {
          title: "Legfrissebb",
          url: "#",
        },
        {
          title: "Korábbi utak",
          url: "#",
        },
       
      ],
    },
    {
      title: "Járművek",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Dokumentáció",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Bemutatkozás",
          url: "#",
        },
        {
          title: "Kezdő Lépések",
          url: "#",
        },
        {
          title: "WIKI",
          url: "#",
        },
        {
          title: "Legfrissebb változtatások",
          url: "#",
        },
      ],
    },
    {
      title: "Beállítások",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Általános",
          url: "#",
        },
        {
          title: "Stílus",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
