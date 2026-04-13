// components/auth/forgot-password-form.tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase" // Your firebase config file
import { sendPasswordResetEmail } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { toast } from "sonner"

export function ForgotPasswordForm({className,...props}: React.ComponentProps<"div">){
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const toastAlert = toast
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)
      toastAlert("Jelszó visszaállító email elküldve!")
    } catch (error: any) {
      toastAlert.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Elfelejtett jelszó</CardTitle>
              <CardDescription>
                Add meg a fiókodhoz tartozó email címet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset}>
                <FieldGroup >
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="minta@minta.hu"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit"> Jelszó visszaállító email küldése küldése</Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
  )
}