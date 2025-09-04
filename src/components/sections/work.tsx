"use client";
import React, { FC } from "react";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { experiences } from "@/data/constants";
import { TExperience } from "@/types/index";
const Spline = React.lazy(() => import("@splinetool/react-spline"));

const ExperienceCard: FC<TExperience> = (experience) => {
  return (
    <VerticalTimelineElement
      contentStyle={{
        background:
          "linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)",
        borderRadius: "20px",
        boxShadow:
          "0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1)",
        color: "#f8fafc",
      }}
      contentArrowStyle={{
        // borderRight: "7px solid #475569",
        borderRight: "7px solid transparent",
      }}
      date={experience.date}
      iconStyle={{
        width: "80px",
        height: "80px",
        marginLeft: "-40px",
        border: "none",
        boxShadow: "none",
      }}
      icon={
        <div className="flex h-full w-full items-center justify-center ">
          <img
            src={experience.icon}
            alt={experience.companyName}
            className="rounded-[100%] w-full h-full"
          />
        </div>
      }
    >
      <div className="bg-gradient-to-br from-slate-600/30 to-slate-700/30 p-4 rounded-lg border border-slate-500/30 shadow-inner">
        <h3 className="text-[24px] font-bold text-slate-50 drop-shadow-lg">
          {experience.companyName}
        </h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {experience.title.split("/").map((tech, techIndex) => (
            <div
              key={`tech-${techIndex}`}
              className="tech-bubble px-3 py-1.5 text-[12px] font-medium text-white bg-gradient-to-r from-blue-500/70 to-indigo-500/70 border border-blue-300/40 rounded-full shadow-lg transition-all duration-300 ease-out cursor-default hover:from-blue-400/80 hover:to-indigo-400/80 hover:scale-105"
              style={{
                boxShadow: `
                  0 3px 12px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3),
                  0 0 15px rgba(59, 130, 246, 0.1)
                `,
              }}
            >
              {tech.trim()}
            </div>
          ))}
        </div>
      </div>

      <ul className="ml-5 mt-5 list-disc space-y-3">
        {experience.points.map((point, index) => (
          <li
            key={`experience-point-${index}`}
            className="text-gray-100 pl-1 text-[14px] tracking-wider leading-relaxed hover:text-white transition-colors duration-200"
          >
            {point}
          </li>
        ))}
      </ul>
    </VerticalTimelineElement>
  );
};
const Work: FC = () => {
  return (
    <div className="h-full bg-gradient-custom pointer-events-auto">
      <section>
        {/* <h3 className="text-[32px] text-center">Past works</h3> */}
        <h3 className="text-[32px] text-center">工作经历</h3>
        <div className="h-[1px] w-[500px] mx-auto  bg-white"></div>
        <div className="flex flex-col">
          <VerticalTimeline className="vertical-timeline pt-[4em]!">
            {experiences.map((item, index) => (
              <ExperienceCard key={index} {...item} />
            ))}
          </VerticalTimeline>
        </div>
      </section>
    </div>
  );
};

export default Work;
