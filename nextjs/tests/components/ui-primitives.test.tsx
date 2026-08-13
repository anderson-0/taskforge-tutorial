import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

  it("renders a native button with defaults, variants, props, and a forwarded ref", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    const ref = createRef<HTMLButtonElement>();

    render(
      <Button ref={ref} type="button" className="test-button" onClick={onClick}>
        Save changes
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toBe(ref.current);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("bg-primary", "h-10", "test-button");
    expect(buttonVariants({ variant: "destructive", size: "lg" }))
      .toContain("bg-destructive");
    expect(buttonVariants({ variant: "destructive", size: "lg" }))
      .toContain("h-11");

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the child element when Button is composed with asChild", () => {
    render(
      <Button asChild variant="secondary" size="sm" className="composed-link">
        <Link href="/projects">View projects</Link>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "View projects" });
    expect(link).toHaveAttribute("href", "/projects");
    expect(link).toHaveClass("bg-secondary", "h-9", "composed-link");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("composes every card region and forwards the card ref and DOM props", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Card ref={ref} data-testid="card" className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Release plan</CardTitle>
          <CardDescription className="custom-description">
            Tasks needed for launch.
          </CardDescription>
        </CardHeader>
        <CardContent className="custom-content">Three tasks</CardContent>
        <CardFooter className="custom-footer">Updated today</CardFooter>
      </Card>,
    );

    const card = screen.getByTestId("card");
    expect(card).toBe(ref.current);
    expect(card).toHaveClass("rounded-lg", "custom-card");
    expect(screen.getByRole("heading", { name: "Release plan" }))
      .toHaveClass("custom-title");
    expect(screen.getByText("Tasks needed for launch."))
      .toHaveClass("custom-description");
    expect(screen.getByText("Three tasks")).toHaveClass("custom-content");
    expect(screen.getByText("Updated today")).toHaveClass("custom-footer");
  });

  it("connects a label to an input and forwards input attributes and refs", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLInputElement>();

    render(
      <div>
        <Label htmlFor="project-name" className="custom-label">
          Project name
        </Label>
        <Input
          ref={ref}
          id="project-name"
          type="text"
          className="custom-input"
          placeholder="Apollo"
        />
      </div>,
    );

    const input = screen.getByLabelText("Project name");
    expect(input).toBe(ref.current);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveClass("custom-input");
    expect(screen.getByText("Project name")).toHaveClass("custom-label");

    await user.type(input, "TaskForge");
    expect(input).toHaveValue("TaskForge");
  });

  it("forwards textarea attributes, custom classes, and its ref", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLTextAreaElement>();

    render(
      <Textarea
        ref={ref}
        aria-label="Project summary"
        rows={4}
        className="custom-textarea"
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Project summary" });
    expect(textarea).toBe(ref.current);
    expect(textarea).toHaveAttribute("rows", "4");
    expect(textarea).toHaveClass("min-h-[80px]", "custom-textarea");

    await user.type(textarea, "Ready for review");
    expect(textarea).toHaveValue("Ready for review");
  });
