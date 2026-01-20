export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admissions: {
        Row: {
          address_details: string | null
          admission_date: string
          admission_status: Database["public"]["Enums"]["admission_status"]
          age: number
          created_at: string | null
          department_id: string
          diagnosis_id: string | null
          district_id: string | null
          doctor_id: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id: string | null
          id: string
          internal_number: number
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id: string | null
          patient_name: string
          phone: string
          station_id: string | null
          unified_number: string
          updated_at: string | null
        }
        Insert: {
          address_details?: string | null
          admission_date: string
          admission_status: Database["public"]["Enums"]["admission_status"]
          age: number
          created_at?: string | null
          department_id: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          internal_number?: number
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id?: string | null
          patient_name: string
          phone: string
          station_id?: string | null
          unified_number: string
          updated_at?: string | null
        }
        Update: {
          address_details?: string | null
          admission_date?: string
          admission_status?: Database["public"]["Enums"]["admission_status"]
          age?: number
          created_at?: string | null
          department_id?: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender?: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          internal_number?: number
          marital_status?: Database["public"]["Enums"]["marital_status"]
          national_id?: string
          occupation_id?: string | null
          patient_name?: string
          phone?: string
          station_id?: string | null
          unified_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      discharges: {
        Row: {
          admission_id: string
          child_national_id: string | null
          created_at: string | null
          discharge_date: string
          discharge_department_id: string | null
          discharge_diagnosis_id: string | null
          discharge_doctor_id: string | null
          discharge_status: Database["public"]["Enums"]["discharge_status"]
          finance_source: Database["public"]["Enums"]["finance_source"] | null
          id: string
        }
        Insert: {
          admission_id: string
          child_national_id?: string | null
          created_at?: string | null
          discharge_date: string
          discharge_department_id?: string | null
          discharge_diagnosis_id?: string | null
          discharge_doctor_id?: string | null
          discharge_status: Database["public"]["Enums"]["discharge_status"]
          finance_source?: Database["public"]["Enums"]["finance_source"] | null
          id?: string
        }
        Update: {
          admission_id?: string
          child_national_id?: string | null
          created_at?: string | null
          discharge_date?: string
          discharge_department_id?: string | null
          discharge_diagnosis_id?: string | null
          discharge_doctor_id?: string | null
          discharge_status?: Database["public"]["Enums"]["discharge_status"]
          finance_source?: Database["public"]["Enums"]["finance_source"] | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discharges_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharges_discharge_department_id_fkey"
            columns: ["discharge_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharges_discharge_diagnosis_id_fkey"
            columns: ["discharge_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharges_discharge_doctor_id_fkey"
            columns: ["discharge_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string | null
          governorate_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          governorate_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          governorate_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      emergencies: {
        Row: {
          address_details: string | null
          admission_id: string | null
          age: number
          created_at: string | null
          department_id: string
          diagnosis_id: string | null
          district_id: string | null
          doctor_id: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id: string | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id: string | null
          patient_name: string
          phone: string
          station_id: string | null
          unified_number: string
          visit_date: string
        }
        Insert: {
          address_details?: string | null
          admission_id?: string | null
          age: number
          created_at?: string | null
          department_id: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id?: string | null
          patient_name: string
          phone: string
          station_id?: string | null
          unified_number: string
          visit_date: string
        }
        Update: {
          address_details?: string | null
          admission_id?: string | null
          age?: number
          created_at?: string | null
          department_id?: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender?: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"]
          national_id?: string
          occupation_id?: string | null
          patient_name?: string
          phone?: string
          station_id?: string | null
          unified_number?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergencies_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      endoscopies: {
        Row: {
          address_details: string | null
          admission_id: string | null
          age: number
          created_at: string | null
          department_id: string
          diagnosis_id: string | null
          district_id: string | null
          doctor_id: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id: string | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id: string | null
          patient_name: string
          phone: string
          procedure_date: string
          station_id: string | null
          unified_number: string
        }
        Insert: {
          address_details?: string | null
          admission_id?: string | null
          age: number
          created_at?: string | null
          department_id: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id?: string | null
          patient_name: string
          phone: string
          procedure_date: string
          station_id?: string | null
          unified_number: string
        }
        Update: {
          address_details?: string | null
          admission_id?: string | null
          age?: number
          created_at?: string | null
          department_id?: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender?: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"]
          national_id?: string
          occupation_id?: string | null
          patient_name?: string
          phone?: string
          procedure_date?: string
          station_id?: string | null
          unified_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "endoscopies_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endoscopies_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_loans: {
        Row: {
          admission_id: string
          borrowed_by: string
          borrowed_to_department: string
          created_at: string | null
          id: string
          internal_number: number
          is_returned: boolean | null
          loan_date: string
          return_date: string | null
          unified_number: string
        }
        Insert: {
          admission_id: string
          borrowed_by: string
          borrowed_to_department: string
          created_at?: string | null
          id?: string
          internal_number: number
          is_returned?: boolean | null
          loan_date: string
          return_date?: string | null
          unified_number: string
        }
        Update: {
          admission_id?: string
          borrowed_by?: string
          borrowed_to_department?: string
          created_at?: string | null
          id?: string
          internal_number?: number
          is_returned?: boolean | null
          loan_date?: string
          return_date?: string | null
          unified_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_loans_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      governorates: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          admission_id: string | null
          created_at: string
          created_by: string
          id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          admission_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          note_text: string
          updated_at?: string
        }
        Update: {
          admission_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      occupations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          address_details: string | null
          admission_id: string | null
          age: number
          created_at: string | null
          department_id: string
          diagnosis_id: string | null
          district_id: string | null
          doctor_id: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id: string | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id: string | null
          patient_name: string
          phone: string
          procedure_date: string
          station_id: string | null
          unified_number: string
        }
        Insert: {
          address_details?: string | null
          admission_id?: string | null
          age: number
          created_at?: string | null
          department_id: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status: Database["public"]["Enums"]["marital_status"]
          national_id: string
          occupation_id?: string | null
          patient_name: string
          phone: string
          procedure_date: string
          station_id?: string | null
          unified_number: string
        }
        Update: {
          address_details?: string | null
          admission_id?: string | null
          age?: number
          created_at?: string | null
          department_id?: string
          diagnosis_id?: string | null
          district_id?: string | null
          doctor_id?: string | null
          gender?: Database["public"]["Enums"]["patient_gender"]
          governorate_id?: string | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"]
          national_id?: string
          occupation_id?: string | null
          patient_name?: string
          phone?: string
          procedure_date?: string
          station_id?: string | null
          unified_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admission_status: "محجوز" | "خروج" | "متوفى" | "تحويل"
      discharge_status: "تحسن" | "تحويل" | "وفاة" | "هروب" | "رفض العلاج"
      finance_source: "تأمين صحي" | "علاج على نفقة الدولة" | "خاص"
      marital_status: "أعزب" | "متزوج" | "مطلق" | "أرمل"
      patient_gender: "ذكر" | "أنثى"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admission_status: ["محجوز", "خروج", "متوفى", "تحويل"],
      discharge_status: ["تحسن", "تحويل", "وفاة", "هروب", "رفض العلاج"],
      finance_source: ["تأمين صحي", "علاج على نفقة الدولة", "خاص"],
      marital_status: ["أعزب", "متزوج", "مطلق", "أرمل"],
      patient_gender: ["ذكر", "أنثى"],
    },
  },
} as const
