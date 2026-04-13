"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { auth, googleProvider } from "@/lib/firebase" 
import { signInWithPopup, createUserWithEmailAndPassword  } from "firebase/auth"
import { Loader2 } from "lucide-react" 
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"



export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const toastAlert = toast

  const handleRegister = async (e: React.FormEvent)=>{
    e.preventDefault()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    toastAlert.warning("Kérjük, adjon meg egy érvényes e-mail címet!");
    return; 
  }

  if (password !== confirmPassword) {
    toastAlert.warning("Jelszavak nem egyeznek!");
    return; 
  }
  if (password.length < 6) {
    toastAlert.warning("A jelszónak legalább 6 karakternek kell lennie!");
    return;
  }

    setLoading (true)
    try{
      await createUserWithEmailAndPassword(auth,email,password)
      toastAlert.success("Sikeres regisztráció! Visszairányítás a bejelentkezéshez!")
      setTimeout(() => {
      router.push('/login'); 
      }, 5000);
    }catch(error: any){
      console.error("Google Auth error", error)
      if (error.code === 'auth/email-already-in-use') {
      toastAlert.warning("Ez az e-mail cím már használatban van!");
    } else {
      toastAlert.error("Sikertelen regisztráció!");
    }
      toastAlert.warning("Sikertelen regisztráció!")
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Hozd létre a fiókod</CardTitle>
          <CardDescription>
            Add meg az email címed hogy elkészítsük a fiókod
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
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
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Jelszó</FieldLabel>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Jelszó ismétlése
                    </FieldLabel>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required  />
                  </Field>
                </Field>
                <FieldDescription>
                  A jelszónak legalább 8 karakter hosszúnak kell lennie
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit">Fiók létrehozása</Button>
                <FieldDescription className="text-center">
                  Van már fiókod? <a href="#" onClick={() => router.push("/login")}>Jelentkezz be</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
