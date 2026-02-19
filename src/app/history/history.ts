import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Use DatePipe if not standalone
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule], // Ensure imports are correct
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History {
  filters = {
    teacher: '',
    course: '',
    startDate: '',
    endDate: ''
  };

  supervisions = [
    {
      id: 1,
      date: new Date('2023-10-24T09:30:00'),
      endTime: new Date('2023-10-24T11:00:00'),
      teacher: {
        name: 'Prof. John Doe',
        department: 'Engineering Dept.',
        initials: 'JD',
        color: 'bg-blue-100 text-blue-600'
      },
      course: {
        code: 'UE-101',
        name: 'Intro to CS'
      },
      platform: 'Zoom',
      platformIcon: 'videocam',
      platformColor: 'text-blue-500',
      status: 'Completed',
      statusColor: 'bg-green-100 text-green-700'
    },
    {
      id: 2,
      date: new Date('2023-10-23T14:00:00'),
      endTime: new Date('2023-10-23T15:30:00'),
      teacher: {
        name: 'Prof. Jane Smith',
        department: 'Mathematics',
        initials: 'JS',
        color: 'bg-pink-100 text-pink-600'
      },
      course: {
        code: 'UE-204',
        name: 'Data Struct'
      },
      platform: 'Teams',
      platformIcon: 'groups',
      platformColor: 'text-indigo-500',
      status: 'Flagged',
      statusColor: 'bg-orange-100 text-orange-700'
    },
    {
      id: 3,
      date: new Date('2023-10-22T10:00:00'),
      endTime: new Date('2023-10-22T12:00:00'),
      teacher: {
        name: 'Prof. Alan Turing',
        department: 'Computer Science',
        initials: 'AT',
        color: 'bg-emerald-100 text-emerald-600'
      },
      course: {
        code: 'UE-305',
        name: 'Algorithms'
      },
      platform: 'Google Meet',
      platformIcon: 'video_camera_front',
      platformColor: 'text-green-600',
      status: 'Completed',
      statusColor: 'bg-green-100 text-green-700'
    },
    {
      id: 4,
      date: new Date('2023-10-21T08:00:00'),
      endTime: new Date('2023-10-21T09:30:00'),
      teacher: {
        name: 'Prof. Marie Curie',
        department: 'Physics',
        initials: 'MC',
        color: 'bg-orange-100 text-orange-600'
      },
      course: {
        code: 'UE-102',
        name: 'Mechanics'
      },
      platform: 'Zoom',
      platformIcon: 'videocam',
      platformColor: 'text-blue-500',
      status: 'Cancelled',
      statusColor: 'bg-red-100 text-red-700'
    },
    {
      id: 5,
      date: new Date('2023-10-20T14:00:00'),
      endTime: new Date('2023-10-20T16:00:00'),
      teacher: {
        name: 'Prof. Ada Lovelace',
        department: 'Software Eng.',
        initials: 'AL',
        color: 'bg-purple-100 text-purple-600'
      },
      course: {
        code: 'UE-400',
        name: 'Design Patterns'
      },
      platform: 'Teams',
      platformIcon: 'groups',
      platformColor: 'text-indigo-500',
      status: 'Completed',
      statusColor: 'bg-green-100 text-green-700'
    }
  ];

  constructor() {}
}
