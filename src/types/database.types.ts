// These types mirror supabase/schema.sql.
// Regenerate automatically with:
// npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts

export type AttendanceStatus = 'on_time' | 'late' | 'absent' | 'awol'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = 'regular' | 'sick_leave' | 'vacation_leave' | 'emergency_leave'

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['agencies']['Insert']>
      }
      principals: {
        Row: {
          id: string
          agency_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['principals']['Insert']>
      }
      merchandisers: {
        Row: {
          id: string
          agency_id: string
          user_id: string | null
          full_name: string
          territory: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id?: string | null
          full_name: string
          territory?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['merchandisers']['Insert']>
      }
      stores: {
        Row: {
          id: string
          principal_id: string
          name: string
          address: string | null
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: string
          principal_id: string
          name: string
          address?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: Partial<Database['public']['Tables']['stores']['Insert']>
      }
      attendance_logs: {
        Row: {
          id: string
          merchandiser_id: string
          store_id: string
          check_in_time: string
          check_out_time: string | null
          status: AttendanceStatus
          biometric_verified: boolean
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          merchandiser_id: string
          store_id: string
          check_in_time: string
          check_out_time?: string | null
          status: AttendanceStatus
          biometric_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['attendance_logs']['Insert']>
      }
      leave_requests: {
        Row: {
          id: string
          merchandiser_id: string
          leave_type: LeaveType
          status: LeaveStatus
          start_date: string
          end_date: string
          reason: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          merchandiser_id: string
          leave_type: LeaveType
          status?: LeaveStatus
          start_date: string
          end_date: string
          reason?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>
      }
      routes: {
        Row: {
          id: string
          merchandiser_id: string
          store_id: string
          scheduled_date: string
          created_at: string
        }
        Insert: {
          id?: string
          merchandiser_id: string
          store_id: string
          scheduled_date: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['routes']['Insert']>
      }
    }
  }
}
